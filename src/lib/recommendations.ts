import "server-only";
import { listEntries } from "./library";
import { key, pickSeeds, score, type Recommendation } from "./scoring";
import { getRecommendationsFor, getTrending } from "./tmdb";

const SEED_COUNT = 10;

export async function getPersonalRecommendations(): Promise<{
  items: Recommendation[];
  personalized: boolean;
}> {
  const [library, trending] = await Promise.all([listEntries(), getTrending("all", "week")]);
  const seeds = pickSeeds(library, SEED_COUNT);

  if (seeds.length === 0) {
    // Pas encore assez d'historique : les tendances qui collent à tes genres
    // d'abord (s'il y en a), puis le reste des tendances.
    const matched = score({ library, seeds: [], trending });
    const seen = new Set([...library.map((e) => key({ mediaType: e.mediaType, id: e.tmdbId })), ...matched.map(key)]);
    const rest = trending
      .filter((t) => t.posterPath && !seen.has(key(t)))
      .map((t) => ({ ...t, score: 0, because: [], trending: true }));
    return { items: [...matched, ...rest], personalized: false };
  }

  const results = await Promise.allSettled(
    seeds.map((entry) => getRecommendationsFor(entry.mediaType, entry.tmdbId)),
  );
  const seeded = seeds.map((entry, i) => {
    const r = results[i];
    return { entry, recommendations: r.status === "fulfilled" ? r.value : [] };
  });

  return { items: score({ library, seeds: seeded, trending }), personalized: true };
}
