import Image from "next/image";
import Link from "next/link";
import { CompassIcon, SearchIcon } from "@/components/icons";
import { EmptyState, RankedShelf, Shelf, type PosterCardProps } from "@/components/poster-card";
import { UpNextCard } from "@/components/up-next-card";
import { ScrollRow } from "@/components/scroll-row";
import { formatRating, titleHref } from "@/lib/labels";
import { listEntries } from "@/lib/library";
import { getPersonalRecommendations } from "@/lib/recommendations";
import type { Entry } from "@/lib/schema";
import { getTrending, imageUrl } from "@/lib/tmdb";
import { getUpNext, type UpNextItem } from "@/lib/up-next";

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

function daysUntil(value: string) {
  const today = Date.parse(new Date().toISOString().slice(0, 10));
  return Math.round((Date.parse(value) - today) / DAY);
}

/** « Aujourd'hui », « Demain », « Jeudi » dans la semaine, sinon « 12 nov. ». */
function airLabel(value: string | null) {
  if (!value) return "Date inconnue";
  const days = daysUntil(value);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  const date = new Date(value);
  if (days < 7) {
    const day = WEEKDAY.format(date);
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
  return SHORT.format(date);
}

function code(e: { season: number; episode: number }) {
  return `S${e.season} · É${e.episode}`;
}

function poster(e: Entry, note?: string): PosterCardProps {
  return { id: e.tmdbId, mediaType: e.mediaType, title: e.title, posterPath: e.posterPath, year: e.year, note };
}

function resumeNote(item: UpNextItem) {
  if (item.resumed) return item.nextToWatch ? `Nouveaux épisodes · saison ${item.nextToWatch.season}` : "Nouveaux épisodes";
  return item.nextToWatch ? `Prochain : ${code(item.nextToWatch)}` : "";
}

function Section({
  title,
  hint,
  href,
  children,
}: {
  title: string;
  hint?: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="section-title">{title}</h2>
          {hint && <p className="text-sm text-muted">{hint}</p>}
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-medium text-muted transition hover:text-accent">
            Tout voir
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function UpcomingRow({ item }: { item: UpNextItem }) {
  const e = item.entry;
  const next = item.upcoming!;
  const soon = next.airDate !== null && daysUntil(next.airDate) < 7;
  const src = imageUrl(e.posterPath, "w185");
  return (
    <Link
      href={titleHref({ mediaType: "tv", id: e.tmdbId })}
      className="group flex items-center gap-3 rounded-xl bg-surface/60 p-2 pr-4 ring-1 ring-white/5 transition hover:bg-surface-2"
    >
      <div className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
        {src && <Image src={src} alt="" fill sizes="44px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium transition group-hover:text-accent">{e.title}</p>
        <p className="line-clamp-1 text-xs text-muted">
          {code(next)}
          {next.name && ` · ${next.name}`}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          soon ? "bg-accent/15 text-accent" : "bg-white/5 text-muted"
        }`}
      >
        {airLabel(next.airDate)}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const [library, upNext, recos, trending] = await Promise.all([
    listEntries(),
    getUpNext(),
    getPersonalRecommendations(),
    getTrending("all", "day"),
  ]);
  const owned = new Set(library.map((e) => `${e.mediaType}:${e.tmdbId}`));

  const { behind, upcoming, upToDate } = upNext;
  const episodesLeft = behind.reduce((sum, i) => sum + i.behind, 0);
  const thisWeek = upcoming.filter((i) => i.upcoming?.airDate && daysUntil(i.upcoming.airDate) < 7).length;

  const watchingMovies = library.filter((e) => e.mediaType === "movie" && e.status === "watching");
  const plannedMovies = library.filter((e) => e.mediaType === "movie" && e.status === "planned");
  const plannedShows = library.filter((e) => e.mediaType === "tv" && e.status === "planned");
  const recent = library
    .filter((e) => e.status === "watched" && e.watchedAt)
    .sort((a, b) => +b.watchedAt! - +a.watchedAt!)
    .slice(0, 15);

  const summary = [
    episodesLeft > 0 && `${episodesLeft} épisode${episodesLeft > 1 ? "s" : ""} à rattraper`,
    thisWeek > 0 && `${thisWeek} sortie${thisWeek > 1 ? "s" : ""} cette semaine`,
    plannedMovies.length > 0 && `${plannedMovies.length} film${plannedMovies.length > 1 ? "s" : ""} à voir`,
  ].filter(Boolean);

  return (
    <>
      <div className="space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ton suivi</h1>
        <p className="text-sm text-muted">
          {library.length === 0
            ? "Ajoute les films et séries que tu regardes pour suivre ta progression ici."
            : summary.length
              ? summary.join(" · ")
              : "Tu es à jour. Rien à rattraper pour l'instant."}
        </p>
      </div>

      {library.length === 0 && (
        <EmptyState>
          <div className="space-y-4">
            <p>
              Cherche une série que tu regardes et choisis « Je regarde » : ses prochains épisodes apparaîtront ici et tu
              pourras les cocher d&apos;un geste.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/recherche" className="btn-primary">
                <SearchIcon width={18} height={18} />
                Ajouter un titre
              </Link>
              <Link href="/decouvrir" className="btn-ghost">
                <CompassIcon width={18} height={18} />
                Trouver des idées
              </Link>
            </div>
          </div>
        </EmptyState>
      )}

      {behind.length > 0 && (
        <Section title="Reprendre" hint="Coche l'épisode suivant dès que tu l'as vu.">
          <ScrollRow>
            {behind.map((item) => {
              const e = item.entry;
              return (
                <UpNextCard
                  key={`${e.tmdbId}:${item.nextToWatch?.season}:${item.nextToWatch?.episode}`}
                  tmdbId={e.tmdbId}
                  title={e.title}
                  href={titleHref({ mediaType: "tv", id: e.tmdbId })}
                  image={imageUrl(item.backdropPath, "w780") ?? imageUrl(e.posterPath, "w500")}
                  // Une série terminée qui reprend se coche depuis sa fiche, pour choisir la saison.
                  next={item.resumed ? null : item.nextToWatch}
                  behind={item.behind}
                  progress={item.aired > 0 ? (item.aired - item.behind) / item.aired : null}
                  note={resumeNote(item)}
                />
              );
            })}
          </ScrollRow>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Prochains épisodes" hint="Tu es à jour sur ces séries : voilà quand sort la suite.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((item) => (
              <UpcomingRow key={item.entry.tmdbId} item={item} />
            ))}
          </div>
        </Section>
      )}

      {watchingMovies.length > 0 && <Shelf title="Films en cours" items={watchingMovies.map((e) => poster(e))} />}

      <Shelf
        title="Films à voir"
        href="/bibliotheque?type=movie&statut=planned"
        items={plannedMovies.map((e) => poster(e))}
      />
      <Shelf
        title="Séries à commencer"
        href="/bibliotheque?type=tv&statut=planned"
        items={plannedShows.map((e) => poster(e))}
      />

      {upToDate.length > 0 && (
        <Shelf
          title="À jour"
          items={upToDate.map((i) => poster(i.entry, "Rien d'annoncé pour l'instant"))}
        />
      )}

      <Shelf
        title="Vu récemment"
        href="/bibliotheque?statut=watched"
        items={recent.map((e) =>
          poster(e, e.rating !== null ? `★ ${formatRating(e.rating)}` : e.watchedAt ? `Vu le ${SHORT.format(e.watchedAt)}` : undefined),
        )}
      />

      {/* La découverte vient après le suivi. */}
      <div className="space-y-12 border-t border-white/5 pt-10">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">À découvrir</h2>
            <p className="text-sm text-muted">Des idées pour la suite, selon tes goûts et les tendances.</p>
          </div>
          <Link href="/decouvrir" className="btn-ghost shrink-0">
            <CompassIcon width={18} height={18} />
            Explorer
          </Link>
        </div>
        <Shelf
          title={recos.personalized ? "Recommandé pour toi" : "Pour commencer"}
          href="/decouvrir"
          items={recos.items.slice(0, 20).map((r) => ({
            ...r,
            actions: "reco",
            note: r.because.length ? `Car tu as aimé ${r.because[0]}` : undefined,
          }))}
        />
        <RankedShelf
          title="Top 10 du jour"
          href="/decouvrir"
          items={trending.slice(0, 10).map((t) => ({ ...t, actions: owned.has(`${t.mediaType}:${t.id}`) ? undefined : "add" }))}
        />
      </div>
    </>
  );
}
