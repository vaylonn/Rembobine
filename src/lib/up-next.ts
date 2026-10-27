import "server-only";
import { listEntries } from "./library";
import type { Entry } from "./schema";
import { getEpisodeStatus, type Episode, type EpisodeStatus } from "./tmdb";

export type UpNextItem = {
  entry: Entry;
  /** Épisodes déjà diffusés que tu n'as pas encore vus. */
  behind: number;
  /** Premier épisode à regarder, s'il est déjà sorti. */
  nextToWatch: { season: number; episode: number } | null;
  /** Prochain épisode annoncé par TMDB. */
  upcoming: Episode | null;
  /** Série marquée « Vu » qui a eu de nouveaux épisodes depuis. */
  resumed: boolean;
};

/**
 * Compte les épisodes diffusés après ta progression (saison, dernier épisode vu).
 * Les saisons viennent de TMDB ; la saison en cours de diffusion s'arrête au
 * dernier épisode sorti.
 */
export function episodesBehind(
  progress: { season: number; episode: number },
  status: Pick<EpisodeStatus, "seasons" | "lastAired">,
) {
  const last = status.lastAired;
  if (!last) return { behind: 0, nextToWatch: null };
  let behind = 0;
  let nextToWatch: UpNextItem["nextToWatch"] = null;
  for (const s of [...status.seasons].sort((a, b) => a.season_number - b.season_number)) {
    if (s.season_number < progress.season || s.season_number > last.season) continue;
    const aired = s.season_number === last.season ? last.episode : s.episode_count;
    const seen = s.season_number === progress.season ? progress.episode : 0;
    if (aired > seen) {
      behind += aired - seen;
      nextToWatch ??= { season: s.season_number, episode: seen + 1 };
    }
  }
  return { behind, nextToWatch };
}

function airedAfter(episode: Episode | null, date: Date | null) {
  return Boolean(episode?.airDate && date && new Date(episode.airDate) > date);
}

/**
 * Séries en cours (avec les épisodes en retard) et séries vues qui ont repris
 * depuis que tu les as terminées.
 */
export async function getUpNext() {
  const shows = (await listEntries({ mediaType: "tv" })).filter(
    (e) => e.status === "watching" || e.status === "watched",
  );
  const statuses = await Promise.all(shows.map((e) => getEpisodeStatus(e.tmdbId)));

  const behind: UpNextItem[] = [];
  const upcoming: UpNextItem[] = [];
  const upToDate: UpNextItem[] = [];

  shows.forEach((entry, i) => {
    const status = statuses[i];
    if (!status) return;

    let item: UpNextItem;
    if (entry.status === "watching") {
      const progress = { season: entry.season ?? 1, episode: entry.episode ?? 0 };
      item = { entry, ...episodesBehind(progress, status), upcoming: status.next, resumed: false };
    } else {
      // Série terminée : on ne signale que ce qui est sorti ou annoncé après la date de visionnage.
      const resumed = airedAfter(status.lastAired, entry.watchedAt ?? entry.updatedAt);
      item = {
        entry,
        behind: 0,
        nextToWatch: resumed && status.lastAired ? { season: status.lastAired.season, episode: 1 } : null,
        upcoming: status.next,
        resumed,
      };
    }

    if (item.behind > 0 || item.resumed) behind.push(item);
    else if (item.upcoming) upcoming.push(item);
    else if (entry.status === "watching") upToDate.push(item);
  });

  const date = (i: UpNextItem) => i.upcoming?.airDate ?? "9999";
  upcoming.sort((a, b) => date(a).localeCompare(date(b)));
  behind.sort((a, b) => b.behind - a.behind);
  return { behind, upcoming, upToDate };
}
