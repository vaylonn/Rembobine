import { Shelf } from "@/components/poster-card";
import { STATUS_LABELS } from "@/lib/labels";
import { listEntries } from "@/lib/library";
import { getPersonalRecommendations } from "@/lib/recommendations";
import { getTrending } from "@/lib/tmdb";

export default async function HomePage() {
  const [watching, planned, recos, trending] = await Promise.all([
    listEntries({ status: "watching" }),
    listEntries({ status: "planned" }),
    getPersonalRecommendations(),
    getTrending("all", "day"),
  ]);

  return (
    <>
      <Shelf
        title="En cours"
        href="/bibliotheque?statut=watching"
        items={watching.map((e) => ({
          id: e.tmdbId,
          mediaType: e.mediaType,
          title: e.title,
          posterPath: e.posterPath,
          year: e.year,
          note: e.mediaType === "tv" && e.season ? `S${e.season} · É${e.episode ?? 0}` : undefined,
        }))}
        empty="Rien en cours. Cherche une série et marque-la « En cours » pour suivre ta progression."
      />
      <Shelf
        title={recos.personalized ? "Recommandé pour toi" : "Pour commencer"}
        href="/decouvrir"
        items={recos.items.slice(0, 20).map((r) => ({
          ...r,
          note: r.because.length ? `Car tu as aimé ${r.because[0]}` : undefined,
        }))}
        empty="Ajoute quelques titres vus pour obtenir des recommandations."
      />
      <Shelf
        title="Tendances du jour"
        href="/decouvrir"
        items={trending.slice(0, 20)}
      />
      <Shelf
        title={STATUS_LABELS.planned}
        href="/bibliotheque?statut=planned"
        items={planned.map((e) => ({
          id: e.tmdbId,
          mediaType: e.mediaType,
          title: e.title,
          posterPath: e.posterPath,
          year: e.year,
        }))}
        empty="Ta liste « À voir » est vide."
      />
    </>
  );
}
