import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "./db";
import { listItems, lists, type MediaType } from "./schema";

export type ListItemInput = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: number | null;
};

/** Toutes les listes, avec leur nombre de titres et quelques affiches pour l'aperçu. */
export async function listLists() {
  await connection();
  const [rows, counts, items] = await Promise.all([
    db().select().from(lists).orderBy(asc(lists.name)),
    db().select({ listId: listItems.listId, n: count() }).from(listItems).groupBy(listItems.listId),
    db()
      .select({ listId: listItems.listId, posterPath: listItems.posterPath })
      .from(listItems)
      .orderBy(desc(listItems.addedAt)),
  ]);
  const n = new Map(counts.map((c) => [c.listId, c.n]));
  return rows.map((l) => ({
    ...l,
    count: n.get(l.id) ?? 0,
    posters: items
      .filter((i) => i.listId === l.id && i.posterPath)
      .slice(0, 4)
      .map((i) => i.posterPath!),
  }));
}

export async function getList(id: number) {
  await connection();
  const [list] = await db().select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list) return null;
  const items = await db()
    .select()
    .from(listItems)
    .where(eq(listItems.listId, id))
    .orderBy(desc(listItems.addedAt));
  return { ...list, items };
}

/** Identifiants des listes qui contiennent ce titre. */
export async function listsContaining(mediaType: MediaType, tmdbId: number) {
  const rows = await db()
    .select({ listId: listItems.listId })
    .from(listItems)
    .where(and(eq(listItems.mediaType, mediaType), eq(listItems.tmdbId, tmdbId)));
  return rows.map((r) => r.listId);
}

export async function createList(name: string) {
  const [row] = await db().insert(lists).values({ name }).returning({ id: lists.id });
  return row.id;
}

export async function renameList(id: number, name: string) {
  await db().update(lists).set({ name }).where(eq(lists.id, id));
}

export async function deleteList(id: number) {
  await db().delete(lists).where(eq(lists.id, id));
}

export async function addToList(listId: number, item: ListItemInput) {
  await db()
    .insert(listItems)
    .values({ listId, ...item })
    .onConflictDoNothing();
}

export async function removeFromList(listId: number, mediaType: MediaType, tmdbId: number) {
  await db()
    .delete(listItems)
    .where(and(eq(listItems.listId, listId), eq(listItems.mediaType, mediaType), eq(listItems.tmdbId, tmdbId)));
}
