import { Hero, type HeroSlide } from "@/components/hero";
import { RankedShelf, Shelf } from "@/components/poster-card";
import { MEDIA_LABELS, STATUS_LABELS, titleHref } from "@/lib/labels";
import { listEntries } from "@/lib/library";
import { getPersonalRecommendations } from "@/lib/recommendations";
import { getTrending, imageUrl } from "@/lib/tmdb";

export default async function HomePage() {
  const [library, recos, trending] = await Promise.all([
    listEntries(),
    getPersonalRecommendations(),
    getTrending("all", "day"),
  ]);
  const watching = library.filter((e) => e.status === "watching");
  const planned = library.filter((e) => e.status === "planned");
  const owned = new Set(library.map((e) => `${e.mediaType}:${e.tmdbId}`));

  const slides: HeroSlide[] = trending
    .map((t, i) => ({ t, rank: i + 1 }))
    .filter(({ t }) => t.backdropPath)
    .slice(0, 5)
    .map(({ t, rank }) => ({
      id: t.id,
      mediaType: t.mediaType,
      title: t.title,
      href: titleHref(t),
      backdrop: imageUrl(t.backdropPath, "w1280")!,
      overview: t.overview,
      facts: [t.year ? String(t.year) : null, MEDIA_LABELS[t.mediaType]].filter((f): f is string => !!f),
      voteAverage: t.voteAverage,
      rank,
      inLibrary: owned.has(`${t.mediaType}:${t.id}`),
    }));

  return (
    <>
      <Hero slides={slides} label="des tendances du jour" />
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
      <RankedShelf title="Top 10 du jour" href="/decouvrir" items={trending.slice(0, 10)} />
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
