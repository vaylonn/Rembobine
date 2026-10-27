import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { dismissals, type MediaType } from "./schema";

export async function listDismissed() {
  return db().select({ mediaType: dismissals.mediaType, tmdbId: dismissals.tmdbId }).from(dismissals);
}

export async function dismiss(mediaType: MediaType, tmdbId: number) {
  await db().insert(dismissals).values({ mediaType, tmdbId }).onConflictDoNothing();
}

export async function undismiss(mediaType: MediaType, tmdbId: number) {
  await db()
    .delete(dismissals)
    .where(and(eq(dismissals.mediaType, mediaType), eq(dismissals.tmdbId, tmdbId)));
}
