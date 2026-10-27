import { PageHeader } from "@/components/page-header";
import { PosterGrid, RankedShelf } from "@/components/poster-card";
import { getPersonalRecommendations } from "@/lib/recommendations";
import { getTrending } from "@/lib/tmdb";

export const metadata = { title: "Découvrir · Rembobine" };

export default async function DiscoverPage() {
  const [recos, movies, shows] = await Promise.all([
    getPersonalRecommendations(),
    getTrending("movie", "week"),
    getTrending("tv", "week"),
  ]);

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
            badge: r.trending ? "Tendance" : undefined,
            note: r.because.length
              ? `Car tu as aimé ${r.because.slice(0, 2).join(" et ")}`
              : undefined,
          }))}
        />
      </section>
      <RankedShelf title="Top 10 des films cette semaine" items={movies.slice(0, 10)} />
      <RankedShelf title="Top 10 des séries cette semaine" items={shows.slice(0, 10)} />
    </>
  );
}
