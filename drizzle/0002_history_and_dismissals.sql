CREATE TABLE "dismissals" (
	"tmdb_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dismissals_media_type_tmdb_id_pk" PRIMARY KEY("media_type","tmdb_id")
);
--> statement-breakpoint
CREATE TABLE "viewings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"season" smallint,
	"episode" smallint,
	"watched_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "viewings_title" ON "viewings" USING btree ("media_type","tmdb_id");--> statement-breakpoint
-- Reprise de l'existant : un visionnage par film déjà marqué « Vu ».
INSERT INTO "viewings" ("tmdb_id", "media_type", "watched_on")
SELECT "tmdb_id", "media_type", ("watched_at" AT TIME ZONE 'Europe/Paris')::date
FROM "entries"
WHERE "media_type" = 'movie' AND "status" = 'watched';
