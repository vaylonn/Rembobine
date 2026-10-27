import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const MEDIA_TYPES = ["movie", "tv"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const STATUSES = ["watched", "watching", "planned", "dropped"] as const;
export type Status = (typeof STATUSES)[number];

export const entries = pgTable(
  "entries",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    year: smallint("year"),
    genreIds: integer("genre_ids").array().notNull().default([]),
    status: text("status").$type<Status>().notNull(),
    // Note sur 10 au demi-point près, facultative.
    rating: real("rating"),
    // Ton avis ou tes notes perso sur le titre.
    notes: text("notes"),
    // Durée en minutes (d'un épisode pour une série), pour les statistiques.
    runtime: smallint("runtime"),
    // Progression pour les séries.
    season: smallint("season"),
    episode: smallint("episode"),
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("entries_tmdb_unique").on(t.tmdbId, t.mediaType)],
);

export type Entry = typeof entries.$inferSelect;

// Échecs de connexion récents, pour freiner les essais de mot de passe en boucle.
export const loginFailures = pgTable(
  "login_failures",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("login_failures_ip_created").on(t.ip, t.createdAt)],
);

// Chaque visionnage : un film (revisionnages compris) ou un épisode de série.
// `watchedOn` est vide quand la date est inconnue (historique repris d'avant).
export const viewings = pgTable(
  "viewings",
  {
    id: serial("id").primaryKey(),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    season: smallint("season"),
    episode: smallint("episode"),
    watchedOn: date("watched_on", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("viewings_title").on(t.mediaType, t.tmdbId)],
);

export type Viewing = typeof viewings.$inferSelect;

// Recommandations masquées (« Pas intéressé »).
export const dismissals = pgTable(
  "dismissals",
  {
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.mediaType, t.tmdbId] })],
);

// Listes perso (« À voir avec X », « Films de Noël »…).
export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type List = typeof lists.$inferSelect;

// Un titre peut être dans une liste sans être dans la bibliothèque :
// on garde de quoi l'afficher.
export const listItems = pgTable(
  "list_items",
  {
    listId: integer("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    year: smallint("year"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.mediaType, t.tmdbId] })],
);
