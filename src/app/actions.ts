"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { deleteEntry, saveEntry } from "@/lib/library";
import { MEDIA_TYPES, STATUSES, type MediaType, type Status } from "@/lib/schema";
import { getDetails } from "@/lib/tmdb";

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

export async function trackTitle(input: TrackInput) {
  await requireSession();
  if (!MEDIA_TYPES.includes(input.mediaType) || !STATUSES.includes(input.status)) {
    throw new Error("Données invalides.");
  }

  // Les métadonnées viennent de TMDB, pas du navigateur.
  const details = await getDetails(input.mediaType, input.tmdbId);
  if (!details) throw new Error("Titre introuvable sur TMDB.");

  await saveEntry({
    tmdbId: details.id,
    mediaType: details.mediaType,
    title: details.title,
    posterPath: details.posterPath,
    year: details.year,
    genreIds: details.genres.map((g) => g.id),
    status: input.status,
    rating: smallInt(input.rating, 1, 10),
    season: input.mediaType === "tv" ? smallInt(input.season, 1, 999) : null,
    episode: input.mediaType === "tv" ? smallInt(input.episode, 0, 9999) : null,
  });
  revalidatePath("/", "layout");
}

export async function untrackTitle(mediaType: MediaType, tmdbId: number) {
  await requireSession();
  if (!MEDIA_TYPES.includes(mediaType)) throw new Error("Données invalides.");
  await deleteEntry(mediaType, tmdbId);
  revalidatePath("/", "layout");
}
