import "server-only";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "./db";
import { entries, viewings, type MediaType, type Viewing } from "./schema";

type TitleRef = { mediaType: MediaType; tmdbId: number };

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

function forTitle({ mediaType, tmdbId }: TitleRef) {
  return and(eq(viewings.mediaType, mediaType), eq(viewings.tmdbId, tmdbId));
}

export async function listViewings(title: TitleRef): Promise<Viewing[]> {
  return db()
    .select()
    .from(viewings)
    .where(forTitle(title))
    .orderBy(sql`${viewings.watchedOn} desc nulls last`, desc(viewings.createdAt));
}

export async function addViewing(title: TitleRef, watchedOn: string | null = today()) {
  await db().insert(viewings).values({ ...title, watchedOn });
}

export async function countViewings(title: TitleRef) {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(viewings)
    .where(forTitle(title));
  return row.n;
}

export async function setViewingDate(title: TitleRef, id: number, watchedOn: string | null) {
  await db()
    .update(viewings)
    .set({ watchedOn })
    .where(and(forTitle(title), eq(viewings.id, id)));
}

export async function deleteViewing(title: TitleRef, id: number) {
  await db().delete(viewings).where(and(forTitle(title), eq(viewings.id, id)));
}

export async function deleteAllViewings(title: TitleRef) {
  await db().delete(viewings).where(forTitle(title));
}

/** Épisodes vus d'une série, sous la forme « saison:épisode ». */
async function seenEpisodes(tmdbId: number) {
  const rows = await db()
    .select({ season: viewings.season, episode: viewings.episode })
    .from(viewings)
    .where(and(forTitle({ mediaType: "tv", tmdbId }), isNotNull(viewings.episode)));
  return new Set(rows.map((r) => `${r.season}:${r.episode}`));
}

/**
 * Marque ou démarque des épisodes. Un épisode déjà vu n'est pas compté deux
 * fois ; démarquer retire tous ses visionnages.
 */
export async function setEpisodes(
  tmdbId: number,
  list: { season: number; episode: number }[],
  seen: boolean,
  watchedOn: string | null = today(),
) {
  if (!list.length) return;
  const title = { mediaType: "tv" as const, tmdbId };
  if (seen) {
    const already = await seenEpisodes(tmdbId);
    const missing = list.filter((e) => !already.has(`${e.season}:${e.episode}`));
    if (missing.length) {
      await db()
        .insert(viewings)
        .values(missing.map((e) => ({ ...title, ...e, watchedOn })));
    }
    return;
  }
  for (const season of new Set(list.map((e) => e.season))) {
    const episodes = list.filter((e) => e.season === season).map((e) => e.episode);
    await db()
      .delete(viewings)
      .where(and(forTitle(title), eq(viewings.season, season), inArray(viewings.episode, episodes)));
  }
}

export async function hasEpisodeViewings(tmdbId: number) {
  return (await seenEpisodes(tmdbId)).size > 0;
}

/**
 * Recalcule ce que la fiche résume à partir de l'historique : la date du
 * dernier visionnage et, pour une série, le dernier épisode vu.
 */
export async function syncEntry(title: TitleRef) {
  const [latest] = await db()
    .select({ watchedOn: viewings.watchedOn })
    .from(viewings)
    .where(and(forTitle(title), isNotNull(viewings.watchedOn)))
    .orderBy(desc(viewings.watchedOn))
    .limit(1);

  const set: Partial<typeof entries.$inferInsert> = { updatedAt: new Date() };
  if (latest?.watchedOn) set.watchedAt = new Date(`${latest.watchedOn}T12:00:00Z`);

  if (title.mediaType === "tv") {
    const [last] = await db()
      .select({ season: viewings.season, episode: viewings.episode })
      .from(viewings)
      .where(and(forTitle(title), isNotNull(viewings.episode)))
      .orderBy(desc(viewings.season), desc(viewings.episode))
      .limit(1);
    // Plus aucun épisode coché : la progression repart de zéro.
    set.season = last?.season ?? null;
    set.episode = last?.episode ?? null;
  }

  await db()
    .update(entries)
    .set(set)
    .where(and(eq(entries.mediaType, title.mediaType), eq(entries.tmdbId, title.tmdbId)));
}

export async function listAllViewings() {
  return db().select().from(viewings);
}
