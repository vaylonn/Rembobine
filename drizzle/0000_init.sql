CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"year" smallint,
	"genre_ids" integer[] DEFAULT '{}' NOT NULL,
	"status" text NOT NULL,
	"rating" smallint,
	"season" smallint,
	"episode" smallint,
	"watched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "entries_tmdb_unique" ON "entries" USING btree ("tmdb_id","media_type");