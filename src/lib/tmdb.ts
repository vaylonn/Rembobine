import "server-only";
import { connection } from "next/server";
import type { MediaType } from "./schema";

const API = "https://api.themoviedb.org/3";
const LANGUAGE = "fr-FR";
const REGION = "FR";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

/** Format commun aux films et aux séries, pour l'affichage en grille. */
export type Title = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  year: number | null;
  overview: string;
  voteAverage: number;
  popularity: number;
  genreIds: number[];
};

export type Genre = { id: number; name: string };

export type Provider = { provider_id: number; provider_name: string; logo_path: string };

export type TitleDetails = Title & {
  tagline: string | null;
  genres: Genre[];
  runtime: number | null;
  seasons: { season_number: number; episode_count: number; name: string }[];
  status: string;
  cast: { id: number; name: string; character: string; profile_path: string | null }[];
  /** Réalisation (films) ou création (séries). */
  directors: { id: number; name: string }[];
  providers: { flatrate: Provider[]; rent: Provider[]; buy: Provider[]; link?: string };
  /** Identifiant TheTVDB, utilisé par Sonarr. */
  tvdbId: number | null;
};

type RawTitle = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
  genres?: Genre[];
};

type Page<T> = { page: number; results: T[]; total_pages: number };

async function tmdb<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = DAY,
): Promise<T> {
  // Rendu à la requête (l'app est privée) ; les réponses TMDB restent en cache via `revalidate`.
  await connection();
  const token = process.env.TMDB_API_TOKEN;
  if (!token) throw new Error("TMDB_API_TOKEN n'est pas défini.");

  const url = new URL(API + path);
  url.searchParams.set("language", LANGUAGE);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} sur ${path}`);
  return res.json() as Promise<T>;
}

function normalize(raw: RawTitle, fallbackType?: MediaType): Title | null {
  const mediaType = (raw.media_type ?? fallbackType) as MediaType | undefined;
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const date = raw.release_date || raw.first_air_date;
  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? "Sans titre",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    year: date ? Number(date.slice(0, 4)) : null,
    overview: raw.overview ?? "",
    voteAverage: raw.vote_average ?? 0,
    popularity: raw.popularity ?? 0,
    genreIds: raw.genre_ids ?? raw.genres?.map((g) => g.id) ?? [],
  };
}

function normalizeAll(raws: RawTitle[], fallbackType?: MediaType) {
  return raws.map((r) => normalize(r, fallbackType)).filter((t): t is Title => t !== null);
}

export function imageUrl(path: string | null, size: "w185" | "w342" | "w500" | "w780" | "w1280" = "w342") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export async function searchTitles(query: string) {
  const data = await tmdb<Page<RawTitle>>(
    "/search/multi",
    { query, include_adult: "false", region: REGION },
    HOUR,
  );
  return normalizeAll(data.results);
}

export async function getTrending(type: "all" | MediaType = "all", window: "day" | "week" = "week") {
  const data = await tmdb<Page<RawTitle>>(`/trending/${type}/${window}`, {}, 6 * HOUR);
  return normalizeAll(data.results, type === "all" ? undefined : type);
}

export async function getRecommendationsFor(type: MediaType, id: number) {
  const data = await tmdb<Page<RawTitle>>(`/${type}/${id}/recommendations`);
  return normalizeAll(data.results, type);
}

export async function getGenres(): Promise<Map<number, string>> {
  const [movie, tv] = await Promise.all([
    tmdb<{ genres: Genre[] }>("/genre/movie/list", {}, 7 * DAY),
    tmdb<{ genres: Genre[] }>("/genre/tv/list", {}, 7 * DAY),
  ]);
  return new Map([...movie.genres, ...tv.genres].map((g) => [g.id, g.name]));
}

type RawDetails = RawTitle & {
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  seasons?: { season_number: number; episode_count: number; name: string }[];
  status?: string;
  credits?: { cast: TitleDetails["cast"]; crew?: { id: number; name: string; job: string }[] };
  created_by?: { id: number; name: string }[];
  external_ids?: { tvdb_id?: number | null };
  "watch/providers"?: {
    results: Record<string, { link?: string; flatrate?: Provider[]; rent?: Provider[]; buy?: Provider[] }>;
  };
};

export async function getDetails(type: MediaType, id: number): Promise<TitleDetails | null> {
  let raw: RawDetails;
  try {
    raw = await tmdb<RawDetails>(`/${type}/${id}`, {
      append_to_response: "credits,watch/providers,external_ids",
    });
  } catch {
    return null;
  }
  const base = normalize(raw, type);
  if (!base) return null;
  const local = raw["watch/providers"]?.results?.[REGION];
  return {
    ...base,
    tagline: raw.tagline || null,
    genres: raw.genres ?? [],
    runtime: raw.runtime ?? raw.episode_run_time?.[0] ?? null,
    seasons: (raw.seasons ?? []).filter((s) => s.season_number > 0),
    status: raw.status ?? "",
    cast: (raw.credits?.cast ?? []).slice(0, 10),
    directors:
      type === "tv"
        ? (raw.created_by ?? []).map(({ id, name }) => ({ id, name }))
        : (raw.credits?.crew ?? []).filter((c) => c.job === "Director").map(({ id, name }) => ({ id, name })),
    providers: {
      flatrate: local?.flatrate ?? [],
      rent: local?.rent ?? [],
      buy: local?.buy ?? [],
      link: local?.link,
    },
    tvdbId: raw.external_ids?.tvdb_id ?? null,
  };
}

type RawEpisode = { season_number: number; episode_number: number; air_date: string | null; name?: string };

export type Episode = { season: number; episode: number; airDate: string | null; name: string };

export type EpisodeStatus = {
  seasons: { season_number: number; episode_count: number }[];
  lastAired: Episode | null;
  next: Episode | null;
  ended: boolean;
  backdropPath: string | null;
};

function episode(raw: RawEpisode | null | undefined): Episode | null {
  if (!raw) return null;
  return {
    season: raw.season_number,
    episode: raw.episode_number,
    airDate: raw.air_date || null,
    name: raw.name ?? "",
  };
}

/** Dernier épisode diffusé et prochain annoncé, rafraîchis plus souvent que la fiche. */
export async function getEpisodeStatus(id: number): Promise<EpisodeStatus | null> {
  let raw: {
    seasons?: { season_number: number; episode_count: number }[];
    last_episode_to_air?: RawEpisode | null;
    next_episode_to_air?: RawEpisode | null;
    status?: string;
    backdrop_path?: string | null;
  };
  try {
    raw = await tmdb(`/tv/${id}`, {}, 6 * HOUR);
  } catch {
    return null;
  }
  return {
    seasons: (raw.seasons ?? []).filter((s) => s.season_number > 0),
    lastAired: episode(raw.last_episode_to_air),
    next: episode(raw.next_episode_to_air),
    ended: raw.status === "Ended" || raw.status === "Canceled",
    backdropPath: raw.backdrop_path ?? null,
  };
}

type RawCredit = RawTitle & { character?: string; job?: string };

export type PersonCredit = Title & { role: string };

export type Person = {
  id: number;
  name: string;
  profilePath: string | null;
  biography: string;
  birthday: string | null;
  placeOfBirth: string | null;
  department: string;
  /** Rôles, du plus connu au moins connu. */
  acting: PersonCredit[];
  /** Réalisation et création. */
  directing: PersonCredit[];
};

/** Dédoublonne (une série peut apparaître plusieurs fois) et trie par popularité. */
function credits(raws: RawCredit[], role: (r: RawCredit) => string) {
  const seen = new Map<string, PersonCredit>();
  for (const raw of raws) {
    const t = normalize(raw);
    if (!t) continue;
    const k = `${t.mediaType}:${t.id}`;
    if (!seen.has(k)) seen.set(k, { ...t, role: role(raw) });
  }
  return [...seen.values()].sort((a, b) => b.popularity - a.popularity);
}

export async function getPerson(id: number): Promise<Person | null> {
  let raw: {
    id: number;
    name: string;
    profile_path: string | null;
    biography?: string;
    birthday?: string | null;
    place_of_birth?: string | null;
    known_for_department?: string;
    combined_credits?: { cast?: RawCredit[]; crew?: RawCredit[] };
  };
  try {
    raw = await tmdb(`/person/${id}`, { append_to_response: "combined_credits" });
  } catch {
    return null;
  }
  const crew = (raw.combined_credits?.crew ?? []).filter((c) => c.job === "Director" || c.job === "Creator");
  return {
    id: raw.id,
    name: raw.name,
    profilePath: raw.profile_path,
    biography: raw.biography ?? "",
    birthday: raw.birthday ?? null,
    placeOfBirth: raw.place_of_birth ?? null,
    department: raw.known_for_department ?? "",
    acting: credits(raw.combined_credits?.cast ?? [], (c) => c.character ?? ""),
    directing: credits(crew, (c) => (c.job === "Creator" ? "Création" : "Réalisation")),
  };
}
