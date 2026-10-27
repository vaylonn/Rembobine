"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { dismiss, undismiss } from "@/lib/dismissals";
import {
  addViewing,
  countViewings,
  deleteAllViewings,
  deleteViewing,
  hasEpisodeViewings,
  listViewings,
  setEpisodes,
  setViewingDate,
  syncEntry,
} from "@/lib/history";
import { addEntryIfMissing, deleteEntry, getEntry, saveEntry, type EntryInput } from "@/lib/library";
import { MEDIA_TYPES, STATUSES, type MediaType, type Status } from "@/lib/schema";
import { getDetails, type TitleDetails } from "@/lib/tmdb";

export type TrackInput = {
  mediaType: MediaType;
  tmdbId: number;
  status: Status;
  rating: number | null;
  season: number | null;
  episode: number | null;
};

function smallInt(value: number | null, min: number, max: number) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function checkTitle(mediaType: MediaType, tmdbId: number) {
  if (!MEDIA_TYPES.includes(mediaType) || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new Error("Données invalides.");
  }
}

// Les métadonnées viennent de TMDB, pas du navigateur.
async function detailsOrThrow(mediaType: MediaType, tmdbId: number) {
  const details = await getDetails(mediaType, tmdbId);
  if (!details) throw new Error("Titre introuvable sur TMDB.");
  return details;
}

function entryFrom(details: TitleDetails, fields: Pick<EntryInput, "status" | "rating" | "season" | "episode">) {
  return {
    tmdbId: details.id,
    mediaType: details.mediaType,
    title: details.title,
    posterPath: details.posterPath,
    year: details.year,
    genreIds: details.genres.map((g) => g.id),
    ...fields,
  };
}

export async function trackTitle(input: TrackInput) {
  await requireSession();
  checkTitle(input.mediaType, input.tmdbId);
  if (!STATUSES.includes(input.status)) throw new Error("Données invalides.");

  const details = await detailsOrThrow(input.mediaType, input.tmdbId);
  await saveEntry(
    entryFrom(details, {
      status: input.status,
      rating: smallInt(input.rating, 1, 10),
      season: input.mediaType === "tv" ? smallInt(input.season, 1, 999) : null,
      episode: input.mediaType === "tv" ? smallInt(input.episode, 0, 9999) : null,
    }),
  );
  // Un film marqué « Vu » pour la première fois entre dans l'historique.
  const title = { mediaType: input.mediaType, tmdbId: input.tmdbId };
  if (input.mediaType === "movie" && input.status === "watched" && (await countViewings(title)) === 0) {
    await addViewing(title);
    await syncEntry(title);
  }
  revalidatePath("/", "layout");
}

export async function untrackTitle(mediaType: MediaType, tmdbId: number) {
  await requireSession();
  checkTitle(mediaType, tmdbId);
  await deleteEntry(mediaType, tmdbId);
  await deleteAllViewings({ mediaType, tmdbId });
  revalidatePath("/", "layout");
}

// Les trois actions suivantes ne relancent pas le rendu de la page : la carte
// garde son état (coche, « Masqué · Annuler ») et la liste se met à jour à la
// prochaine navigation.

/** Ajout rapide depuis une affiche. Ne touche pas à un titre déjà suivi. */
export async function quickAdd(mediaType: MediaType, tmdbId: number, status: "planned" | "watched") {
  await requireSession();
  checkTitle(mediaType, tmdbId);
  if (status !== "planned" && status !== "watched") throw new Error("Données invalides.");

  const details = await detailsOrThrow(mediaType, tmdbId);
  const added = await addEntryIfMissing(entryFrom(details, { status, rating: null, season: null, episode: null }));
  if (added && mediaType === "movie" && status === "watched") {
    await addViewing({ mediaType, tmdbId });
    await syncEntry({ mediaType, tmdbId });
  }
}

export async function dismissTitle(mediaType: MediaType, tmdbId: number) {
  await requireSession();
  checkTitle(mediaType, tmdbId);
  await dismiss(mediaType, tmdbId);
}

export async function undismissTitle(mediaType: MediaType, tmdbId: number) {
  await requireSession();
  checkTitle(mediaType, tmdbId);
  await undismiss(mediaType, tmdbId);
}

// --- Historique -----------------------------------------------------------

export type HistoryState = {
  viewings: { id: number; season: number | null; episode: number | null; watchedOn: string | null }[];
  season: number | null;
  episode: number | null;
};

async function historyState(mediaType: MediaType, tmdbId: number): Promise<HistoryState> {
  const [rows, entry] = await Promise.all([listViewings({ mediaType, tmdbId }), getEntry(mediaType, tmdbId)]);
  return {
    viewings: rows.map(({ id, season, episode, watchedOn }) => ({ id, season, episode, watchedOn })),
    season: entry?.season ?? null,
    episode: entry?.episode ?? null,
  };
}

function checkDate(value: string | null) {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error("Date invalide.");
  return value;
}

/** Revisionnage d'un film (ou visionnage daté d'un film déjà vu). */
export async function logRewatch(tmdbId: number, watchedOn: string | null) {
  await requireSession();
  checkTitle("movie", tmdbId);
  const title = { mediaType: "movie" as const, tmdbId };
  if (!(await getEntry("movie", tmdbId))) throw new Error("Titre absent de la bibliothèque.");
  await addViewing(title, checkDate(watchedOn));
  await syncEntry(title);
  revalidatePath("/", "layout");
  return historyState("movie", tmdbId);
}

export async function changeViewingDate(mediaType: MediaType, tmdbId: number, id: number, watchedOn: string | null) {
  await requireSession();
  checkTitle(mediaType, tmdbId);
  await setViewingDate({ mediaType, tmdbId }, id, checkDate(watchedOn));
  await syncEntry({ mediaType, tmdbId });
  revalidatePath("/", "layout");
  return historyState(mediaType, tmdbId);
}

export async function removeViewing(mediaType: MediaType, tmdbId: number, id: number) {
  await requireSession();
  checkTitle(mediaType, tmdbId);
  await deleteViewing({ mediaType, tmdbId }, id);
  await syncEntry({ mediaType, tmdbId });
  revalidatePath("/", "layout");
  return historyState(mediaType, tmdbId);
}

/**
 * Coche ou décoche des épisodes. La première fois, la progression notée avant
 * l'historique (saison et dernier épisode) est convertie en épisodes vus.
 */
export async function markEpisodes(tmdbId: number, list: { season: number; episode: number }[], seen: boolean) {
  await requireSession();
  checkTitle("tv", tmdbId);
  const episodes = list
    .map((e) => ({ season: smallInt(e.season, 1, 999), episode: smallInt(e.episode, 1, 9999) }))
    .filter((e): e is { season: number; episode: number } => e.season !== null && e.episode !== null)
    .slice(0, 2000);

  const details = await detailsOrThrow("tv", tmdbId);
  let entry = await getEntry("tv", tmdbId);
  if (!entry) {
    await saveEntry(entryFrom(details, { status: "watching", rating: null, season: null, episode: null }));
    entry = await getEntry("tv", tmdbId);
  } else if (entry.status === "planned" && seen) {
    await saveEntry(
      entryFrom(details, { status: "watching", rating: entry.rating, season: entry.season, episode: entry.episode }),
    );
  }

  if (entry?.season && !(await hasEpisodeViewings(tmdbId))) {
    const legacy = details.seasons.flatMap((s) =>
      Array.from({ length: s.episode_count }, (_, i) => ({ season: s.season_number, episode: i + 1 })).filter(
        (e) => e.season < entry.season! || (e.season === entry.season && e.episode <= (entry.episode ?? 0)),
      ),
    );
    // Ces épisodes ont été vus à une date inconnue.
    await setEpisodes(tmdbId, legacy, true, null);
  }

  await setEpisodes(tmdbId, episodes, seen);
  await syncEntry({ mediaType: "tv", tmdbId });
  revalidatePath("/", "layout");
  return historyState("tv", tmdbId);
}
