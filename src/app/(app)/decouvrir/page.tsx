import { PosterGrid } from "@/components/poster-card";
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
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            {recos.personalized ? "Recommandé pour toi" : "Pour commencer"}
          </h1>
          <p className="text-sm text-muted">
            {recos.personalized
              ? "Calculé à partir de tes notes, de tes genres préférés et des tendances de la semaine."
              : "Marque quelques titres comme vus (et note-les) pour personnaliser cette page."}
          </p>
        </div>
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
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Films tendance cette semaine</h2>
        <PosterGrid items={movies.slice(0, 12)} />
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Séries tendance cette semaine</h2>
        <PosterGrid items={shows.slice(0, 12)} />
      </section>
    </>
  );
}
