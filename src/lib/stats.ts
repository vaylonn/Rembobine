import "server-only";
import { listAllViewings } from "./history";
import { listEntries, setRuntime } from "./library";
import type { Entry, Viewing } from "./schema";
import { getDetails, getGenres } from "./tmdb";

const k = (e: { mediaType: string; tmdbId: number }) => `${e.mediaType}:${e.tmdbId}`;

/** Renseigne la durée des titres ajoutés avant qu'on la garde (une fois pour toutes). */
async function fillRuntimes(entries: Entry[]) {
  const missing = entries.filter((e) => e.runtime === null && e.status !== "planned");
  for (let i = 0; i < missing.length; i += 8) {
    await Promise.all(
      missing.slice(i, i + 8).map(async (e) => {
        const d = await getDetails(e.mediaType, e.tmdbId);
        const runtime = d?.runtime ? Math.min(32000, Math.round(d.runtime)) : null;
        e.runtime = runtime;
        if (runtime) await setRuntime(e.mediaType, e.tmdbId, runtime);
      }),
    );
  }
}

export type Bar = { label: string; value: number; hint?: string };

export type Stats = {
  year: number | null;
  years: number[];
  movies: number;
  rewatches: number;
  shows: number;
  episodes: number;
  minutes: number;
  avgRating: number | null;
  byMonth: Bar[];
  genres: (Bar & { avg: number | null })[];
  ratings: Bar[];
  perYear: { year: number; movies: number; episodes: number; minutes: number; avg: number | null }[];
  highlights: {
    bestMovie: Entry | null;
    topShow: { entry: Entry; episodes: number } | null;
    busiestMonth: Bar | null;
    firstViewing: { entry: Entry; date: string } | null;
  };
};

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function yearOf(v: Viewing) {
  return v.watchedOn ? Number(v.watchedOn.slice(0, 4)) : null;
}

/** Statistiques sur toute la bibliothèque, ou bilan d'une année si `year` est donné. */
export async function getStats(year: number | null): Promise<Stats> {
  const [library, allViewings, genreNames] = await Promise.all([listEntries(), listAllViewings(), getGenres()]);
  await fillRuntimes(library);
  const byKey = new Map(library.map((e) => [k(e), e]));

  const years = [...new Set(allViewings.map(yearOf).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  const viewings = allViewings.filter((v) => byKey.has(k(v)) && (year === null || yearOf(v) === year));

  const movieViews = viewings.filter((v) => v.mediaType === "movie");
  const episodeViews = viewings.filter((v) => v.mediaType === "tv" && v.episode !== null);
  const minutesOf = (vs: Viewing[]) => vs.reduce((n, v) => n + (byKey.get(k(v))?.runtime ?? 0), 0);

  // Les titres concernés : vus dans l'année, ou toute la bibliothèque hors « À voir ».
  const titles =
    year === null
      ? library.filter((e) => e.status !== "planned")
      : [...new Set(viewings.map(k))].map((key) => byKey.get(key)!).filter(Boolean);
  const movieTitles = new Set(movieViews.map(k));
  const showTitles = new Set(episodeViews.map(k));
  if (year === null) {
    for (const e of library) if (e.mediaType === "tv" && (e.status === "watched" || e.status === "watching")) showTitles.add(k(e));
  }
  const rated = titles.filter((e) => e.rating !== null);

  // Par mois : les 12 mois de l'année choisie, sinon les 12 derniers mois.
  const now = new Date();
  const months =
    year === null
      ? Array.from({ length: 12 }, (_, i) => {
          const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
          return d.toISOString().slice(0, 7);
        })
      : Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const byMonth = months.map((m) => {
    const vs = viewings.filter((v) => v.watchedOn?.startsWith(m));
    const minutes = minutesOf(vs);
    return {
      label: MONTHS[Number(m.slice(5, 7)) - 1],
      value: Math.round(minutes / 60),
      hint: `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)} : ${Math.round(minutes / 60)} h · ${vs.filter((v) => v.mediaType === "movie").length} films, ${vs.filter((v) => v.mediaType === "tv").length} épisodes`,
    };
  });

  const genreMap = new Map<number, Entry[]>();
  for (const e of titles) for (const g of e.genreIds) genreMap.set(g, [...(genreMap.get(g) ?? []), e]);
  const genres = [...genreMap]
    .map(([id, es]) => {
      const avg = average(es.filter((e) => e.rating !== null).map((e) => e.rating!));
      return {
        label: genreNames.get(id) ?? "Autre",
        value: es.length,
        avg,
        hint: `${es.length} titre${es.length > 1 ? "s" : ""}${avg ? ` · note moyenne ${avg.toFixed(1)}` : ""}`,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const ratings = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const count = rated.filter((e) => Math.ceil(e.rating!) === n).length;
    return { label: String(n), value: count, hint: `${count} titre${count > 1 ? "s" : ""} noté${count > 1 ? "s" : ""} ${n - 0.5} ou ${n}` };
  });

  const perYear = years.map((y) => {
    const vs = allViewings.filter((v) => byKey.has(k(v)) && yearOf(v) === y);
    const ts = [...new Set(vs.map(k))].map((key) => byKey.get(key)!);
    return {
      year: y,
      movies: vs.filter((v) => v.mediaType === "movie").length,
      episodes: vs.filter((v) => v.mediaType === "tv" && v.episode !== null).length,
      minutes: minutesOf(vs),
      avg: average(ts.filter((e) => e.rating !== null).map((e) => e.rating!)),
    };
  });

  const episodesByShow = new Map<string, number>();
  for (const v of episodeViews) episodesByShow.set(k(v), (episodesByShow.get(k(v)) ?? 0) + 1);
  const [topShowKey, topShowCount] = [...episodesByShow].sort((a, b) => b[1] - a[1])[0] ?? [];
  const bestMovie =
    [...movieTitles]
      .map((key) => byKey.get(key)!)
      .filter((e) => e.rating !== null)
      .sort((a, b) => b.rating! - a.rating!)[0] ?? null;
  const dated = viewings.filter((v) => v.watchedOn).sort((a, b) => a.watchedOn!.localeCompare(b.watchedOn!));
  const busiest = [...byMonth].sort((a, b) => b.value - a.value)[0];

  return {
    year,
    years,
    movies: movieTitles.size,
    rewatches: movieViews.length - movieTitles.size,
    shows: showTitles.size,
    episodes: episodeViews.length,
    minutes: minutesOf(movieViews) + minutesOf(episodeViews),
    avgRating: average(rated.map((e) => e.rating!)),
    byMonth,
    genres,
    ratings,
    perYear,
    highlights: {
      bestMovie,
      topShow: topShowKey ? { entry: byKey.get(topShowKey)!, episodes: topShowCount! } : null,
      busiestMonth: busiest && busiest.value > 0 ? busiest : null,
      firstViewing: dated[0] ? { entry: byKey.get(k(dated[0]))!, date: dated[0].watchedOn! } : null,
    },
  };
}
