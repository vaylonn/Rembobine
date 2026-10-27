import { PageHeader } from "@/components/page-header";
import { PosterGrid, RankedShelf, Shelf } from "@/components/poster-card";
import { listEntries } from "@/lib/library";
import { getPeopleRecommendations } from "@/lib/people-recos";
import { getPersonalRecommendations } from "@/lib/recommendations";
import type { Title } from "@/lib/tmdb";
import { getTrending } from "@/lib/tmdb";

export const metadata = { title: "Découvrir · Rembobine" };

export default async function DiscoverPage() {
  const [recos, movies, shows, library, people] = await Promise.all([
    getPersonalRecommendations(),
    getTrending("movie", "week"),
    getTrending("tv", "week"),
    listEntries(),
    getPeopleRecommendations().catch(() => []),
  ]);
  const owned = new Set(library.map((e) => `${e.mediaType}:${e.tmdbId}`));
  const withAdd = (items: Title[]) =>
    items.map((t) => ({ ...t, actions: owned.has(`${t.mediaType}:${t.id}`) ? undefined : ("add" as const) }));

  return (
    <>
      <section className="space-y-6">
        <PageHeader
          title={recos.personalized ? "Recommandé pour toi" : "Pour commencer"}
          subtitle={
            recos.personalized
              ? "Calculé à partir de tes notes, de tes genres préférés et des tendances de la semaine."
              : "Marque quelques titres comme vus (et note-les) pour personnaliser cette page."
          }
        />
        <PosterGrid
          items={recos.items.slice(0, 36).map((r) => ({
            ...r,
            actions: "reco" as const,
            badge: r.trending ? "Tendance" : undefined,
            note: r.because.length
              ? `Car tu as aimé ${r.because.slice(0, 2).join(" et ")}`
              : undefined,
          }))}
        />
      </section>
      {people.map((p) => (
        <Shelf
          key={p.person.id}
          title={`Parce que tu aimes ${p.person.name}`}
          href={`/personne/${p.person.id}`}
          items={p.items.map((t) => ({
            ...t,
            actions: "reco" as const,
            note: [t.year, t.role].filter(Boolean).join(" · ") || undefined,
          }))}
        />
      ))}
      <RankedShelf title="Top 10 des films cette semaine" items={withAdd(movies.slice(0, 10))} />
      <RankedShelf title="Top 10 des séries cette semaine" items={withAdd(shows.slice(0, 10))} />
    </>
  );
}
