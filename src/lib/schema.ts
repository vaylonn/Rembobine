import {
  index,
  integer,
  pgTable,
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
    // Note sur 10, facultative.
    rating: smallint("rating"),
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
