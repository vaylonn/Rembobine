import type { Entry } from "./schema";
import type { Title } from "./tmdb";

/** Note implicite quand un titre est vu sans être noté. */
const DEFAULT_RATING = 7;

export type Recommendation = Title & {
  score: number;
  /** Titres de ta bibliothèque qui ont mené à cette suggestion. */
  because: string[];
  trending: boolean;
};

export function key(t: { mediaType: string; id: number }) {
  return `${t.mediaType}:${t.id}`;
}

/** Ce que le titre dit de tes goûts : > 0 tu as aimé, < 0 tu n'as pas aimé. */
export function affinity(entry: Pick<Entry, "status" | "rating">) {
  if (entry.status === "dropped") return -2;
  if (entry.status === "planned") return 0.5;
  return (entry.rating ?? DEFAULT_RATING) - 5;
}

/** Poids par genre, normalisé entre -1 et 1, à partir de toute la bibliothèque. */
export function genreProfile(library: Entry[]) {
  const totals = new Map<number, number>();
  for (const entry of library) {
    const weight = affinity(entry);
    for (const g of entry.genreIds) totals.set(g, (totals.get(g) ?? 0) + weight);
  }
  const max = Math.max(1, ...[...totals.values()].map(Math.abs));
  return new Map([...totals].map(([g, v]) => [g, v / max]));
}

function genreFit(genreIds: number[], profile: Map<number, number>) {
  if (!genreIds.length) return 0;
  return genreIds.reduce((sum, g) => sum + (profile.get(g) ?? 0), 0) / genreIds.length;
}

/** Les titres qui servent de point de départ : les mieux notés, puis les plus récents. */
export function pickSeeds(library: Entry[], count: number) {
  return library
    .filter((e) => (e.status === "watched" || e.status === "watching") && affinity(e) > 0)
    .sort(
      (a, b) =>
        affinity(b) - affinity(a) || b.updatedAt.getTime() - a.updatedAt.getTime(),
    )
    .slice(0, count);
}

/**
 * Combine trois signaux :
 * - les recommandations TMDB de chaque titre que tu as aimé (pondérées par ta note
 *   et par le rang de la suggestion),
 * - ton affinité de genres calculée sur toute ta bibliothèque,
 * - un bonus si le titre est dans les tendances de la semaine.
 */
export function score(input: {
  library: Entry[];
  seeds: { entry: Entry; recommendations: Title[] }[];
  trending: Title[];
}): Recommendation[] {
  const owned = new Set(input.library.map((e) => key({ mediaType: e.mediaType, id: e.tmdbId })));
  const trendingKeys = new Set(input.trending.map(key));
  const profile = genreProfile(input.library);
  const candidates = new Map<string, Recommendation>();

  const consider = (title: Title, points: number, because?: string) => {
    const k = key(title);
    if (owned.has(k) || !title.posterPath) return;
    const current =
      candidates.get(k) ??
      ({ ...title, score: 0, because: [], trending: trendingKeys.has(k) } as Recommendation);
    current.score += points;
    if (because && !current.because.includes(because)) current.because.push(because);
    candidates.set(k, current);
  };

  for (const { entry, recommendations } of input.seeds) {
    const weight = affinity(entry) / 5;
    recommendations.forEach((title, rank) => {
      consider(title, weight * (1 - rank / (recommendations.length + 1)), entry.title);
    });
  }

  // Les tendances entrent aussi en lice, mais seulement si elles collent à tes genres.
  for (const title of input.trending) {
    const fit = genreFit(title.genreIds, profile);
    if (fit > 0) consider(title, fit * 0.5);
  }

  for (const c of candidates.values()) {
    c.score += genreFit(c.genreIds, profile) * 0.6;
    if (c.trending) c.score += 0.3;
    // Un petit coup de pouce aux titres bien notés par le public.
    c.score += Math.max(0, c.voteAverage - 6) * 0.05;
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score);
}
