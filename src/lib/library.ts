import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "./db";
import { entries, type Entry, type MediaType, type Status } from "./schema";

export type EntryInput = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: number | null;
  genreIds: number[];
  status: Status;
  rating: number | null;
  season: number | null;
  episode: number | null;
};

export async function listEntries(filter: { mediaType?: MediaType; status?: Status } = {}) {
  // Les données de la bibliothèque sont lues à chaque requête, jamais au build.
  await connection();
  const conditions = [];
  if (filter.mediaType) conditions.push(eq(entries.mediaType, filter.mediaType));
  if (filter.status) conditions.push(eq(entries.status, filter.status));
  return db()
    .select()
    .from(entries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(entries.updatedAt));
}

export async function getEntry(mediaType: MediaType, tmdbId: number): Promise<Entry | undefined> {
  await connection();
  const rows = await db()
    .select()
    .from(entries)
    .where(and(eq(entries.mediaType, mediaType), eq(entries.tmdbId, tmdbId)))
    .limit(1);
  return rows[0];
}

/** Ajoute le titre s'il n'est pas déjà dans la bibliothèque. Vrai s'il a été ajouté. */
export async function addEntryIfMissing(input: EntryInput) {
  const now = new Date();
  const rows = await db()
    .insert(entries)
    .values({ ...input, watchedAt: input.status === "watched" ? now : null, updatedAt: now })
    .onConflictDoNothing()
    .returning({ id: entries.id });
  return rows.length > 0;
}

export async function saveEntry(input: EntryInput) {
  const now = new Date();
  // La date de visionnage est fixée la première fois qu'on passe en « vu ».
  const watchedAt = input.status === "watched" ? now : null;
  await db()
    .insert(entries)
    .values({ ...input, watchedAt, updatedAt: now })
    .onConflictDoUpdate({
      target: [entries.tmdbId, entries.mediaType],
      set: {
        title: input.title,
        posterPath: input.posterPath,
        year: input.year,
        genreIds: input.genreIds,
        status: input.status,
        rating: input.rating,
        season: input.season,
        episode: input.episode,
        watchedAt:
          input.status === "watched"
            ? sql`coalesce(${entries.watchedAt}, ${now.toISOString()}::timestamptz)`
            : sql`${entries.watchedAt}`,
        updatedAt: now,
      },
    });
}

export async function deleteEntry(mediaType: MediaType, tmdbId: number) {
  await db()
    .delete(entries)
    .where(and(eq(entries.mediaType, mediaType), eq(entries.tmdbId, tmdbId)));
}
