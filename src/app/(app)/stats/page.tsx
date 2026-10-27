import Image from "next/image";
import Link from "next/link";
import { ColumnChart, RankChart, StatTile } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/poster-card";
import { formatRating, titleHref } from "@/lib/labels";
import type { Entry } from "@/lib/schema";
import { getStats } from "@/lib/stats";
import { imageUrl } from "@/lib/tmdb";

export const metadata = { title: "Stats · Rembobine" };

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

function hours(minutes: number) {
  return `${Math.round(minutes / 60)} h`;
}

function days(minutes: number) {
  const d = minutes / 60 / 24;
  return d >= 2 ? `soit ${Math.round(d)} jours, films et épisodes` : "films et épisodes";
}

function Highlight({ label, entry, detail }: { label: string; entry: Entry; detail: string }) {
  const poster = imageUrl(entry.posterPath, "w185");
  return (
    <Link
      href={titleHref({ mediaType: entry.mediaType, id: entry.tmdbId })}
      className="flex gap-4 rounded-2xl border border-white/5 bg-surface p-3 transition hover:border-accent/50"
    >
      <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {poster && <Image src={poster} alt="" fill sizes="64px" className="object-cover" />}
      </div>
      <div className="min-w-0 self-center">
        <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
        <p className="line-clamp-2 font-display text-lg font-semibold">{entry.title}</p>
        <p className="text-sm text-accent">{detail}</p>
      </div>
    </Link>
  );
}

export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  const { annee } = await searchParams;
  const requested = Number(annee);
  const year = Number.isInteger(requested) && requested > 1900 ? requested : null;
  const s = await getStats(year);
  const h = s.highlights;
  const nothing = s.movies + s.episodes + s.shows === 0;

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? "bg-accent text-accent-fg" : "bg-white/5 text-muted hover:bg-white/10 hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <section className="space-y-8">
      <PageHeader
        title={year ? `Ton année ${year}` : "Tes stats"}
        subtitle={
          year
            ? "Ton bilan de l'année, calculé à partir des dates de visionnage."
            : "Tout ce que tu as regardé depuis que tu utilises Rembobine."
        }
      />
      <div className="flex flex-wrap gap-2">
        {chip("Depuis le début", "/stats", year === null)}
        {s.years.map((y) => chip(String(y), `/stats?annee=${y}`, y === year))}
      </div>

      {nothing ? (
        <EmptyState>Rien à compter pour l&apos;instant. Marque des films comme vus ou coche des épisodes.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Temps passé" value={hours(s.minutes)} sub={days(s.minutes)} />
            <StatTile
              label="Films"
              value={s.movies}
              sub={s.rewatches ? `+ ${s.rewatches} revisionnage${s.rewatches > 1 ? "s" : ""}` : undefined}
            />
            <StatTile label="Épisodes" value={s.episodes} sub={`${s.shows} série${s.shows > 1 ? "s" : ""}`} />
            <StatTile label="Note moyenne" value={s.avgRating ? formatRating(Math.round(s.avgRating * 10) / 10) : "–"} sub="sur 10" />
          </div>

          {year && (h.bestMovie || h.topShow || h.busiestMonth || h.firstViewing) && (
            <div className="grid gap-3 md:grid-cols-2">
              {h.bestMovie && (
                <Highlight label="Ton film de l'année" entry={h.bestMovie} detail={`★ ${formatRating(h.bestMovie.rating!)} / 10`} />
              )}
              {h.topShow && (
                <Highlight
                  label="Ta série de l'année"
                  entry={h.topShow.entry}
                  detail={`${h.topShow.episodes} épisode${h.topShow.episodes > 1 ? "s" : ""} vus`}
                />
              )}
              {h.firstViewing && (
                <Highlight
                  label="Tout a commencé avec"
                  entry={h.firstViewing.entry}
                  detail={`le ${DATE.format(new Date(h.firstViewing.date))}`}
                />
              )}
              {h.busiestMonth && (
                <StatTile label="Ton mois le plus chargé" value={h.busiestMonth.label} sub={`${h.busiestMonth.value} h devant l'écran`} />
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ColumnChart
              title={year ? `Heures de visionnage par mois en ${year}` : "Heures de visionnage, 12 derniers mois"}
              bars={s.byMonth}
              unit="h"
            />
            <ColumnChart title="Répartition de tes notes" bars={s.ratings} unit="titres" />
          </div>
          {s.genres.length > 0 && <RankChart title="Tes genres (nombre de titres)" bars={s.genres} />}

          {!year && s.perYear.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-surface">
              <table className="w-full text-sm">
                <caption className="px-4 pt-4 text-left text-sm font-semibold">Année par année</caption>
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Année</th>
                    <th className="px-4 py-2 font-medium">Films</th>
                    <th className="px-4 py-2 font-medium">Épisodes</th>
                    <th className="px-4 py-2 font-medium">Temps</th>
                    <th className="px-4 py-2 font-medium">Note moyenne</th>
                  </tr>
                </thead>
                <tbody>
                  {s.perYear.map((y) => (
                    <tr key={y.year} className="border-t border-white/5">
                      <td className="px-4 py-2">
                        <Link href={`/stats?annee=${y.year}`} className="font-medium text-accent hover:underline">
                          {y.year}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{y.movies}</td>
                      <td className="px-4 py-2">{y.episodes}</td>
                      <td className="px-4 py-2">{hours(y.minutes)}</td>
                      <td className="px-4 py-2">{y.avg ? formatRating(Math.round(y.avg * 10) / 10) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted">
            Le temps est calculé avec la durée TMDB de chaque film et d&apos;un épisode type par série. Les épisodes cochés
            sans date comptent dans le total, pas dans les mois.
          </p>
        </>
      )}
    </section>
  );
}
