"use client";

import { useState, useTransition } from "react";
import { changeViewingDate, logRewatch, markEpisodes, removeViewing, type HistoryState } from "@/app/actions";
import type { MediaType } from "@/lib/schema";

type Season = { season_number: number; episode_count: number };
type Ep = { season: number; episode: number };

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function code(e: { season: number | null; episode: number | null }) {
  return `S${e.season}·É${e.episode}`;
}

/** Épisodes vus : l'historique s'il existe, sinon la progression notée avant lui. */
function seenSet(history: HistoryState, seasons: Season[]) {
  const rows = history.viewings.filter((v) => v.episode !== null);
  if (rows.length) return new Set(rows.map((v) => `${v.season}:${v.episode}`));
  const set = new Set<string>();
  if (!history.season) return set;
  for (const s of seasons) {
    for (let e = 1; e <= s.episode_count; e++) {
      if (s.season_number < history.season || (s.season_number === history.season && e <= (history.episode ?? 0))) {
        set.add(`${s.season_number}:${e}`);
      }
    }
  }
  return set;
}

function useHistoryAction(onChange: (h: HistoryState) => void) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<HistoryState>) => {
    setError(null);
    startTransition(async () => {
      try {
        onChange(await action());
      } catch {
        setError("Impossible d'enregistrer. Réessaie.");
      }
    });
  };
  return { pending, error, run };
}

function DateField({
  value,
  disabled,
  onChange,
}: {
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <input
      type="date"
      className="input w-auto px-3 py-1 text-xs [color-scheme:dark]"
      // Une date inconnue reste vide ; on peut la renseigner après coup.
      value={value ?? ""}
      max={new Date().toISOString().slice(0, 10)}
      disabled={disabled}
      aria-label="Date de visionnage"
      onChange={(e) => onChange(e.target.value || null)}
    />
  );
}

function ViewingList({
  mediaType,
  tmdbId,
  rows,
  pending,
  run,
}: {
  mediaType: MediaType;
  tmdbId: number;
  rows: HistoryState["viewings"];
  pending: boolean;
  run: (action: () => Promise<HistoryState>) => void;
}) {
  return (
    <ul className="divide-y divide-white/5 text-sm">
      {rows.map((v) => (
        <li key={v.id} className="flex flex-wrap items-center gap-3 py-2">
          <span className="min-w-16 font-medium">
            {v.episode !== null ? code(v) : v.watchedOn ? DATE.format(new Date(v.watchedOn)) : "Date inconnue"}
          </span>
          <DateField
            value={v.watchedOn}
            disabled={pending}
            onChange={(date) => run(() => changeViewingDate(mediaType, tmdbId, v.id, date))}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => removeViewing(mediaType, tmdbId, v.id))}
            className="ml-auto text-xs text-muted hover:text-red-400"
          >
            Supprimer
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MovieHistory({
  tmdbId,
  history,
  onChange,
}: {
  tmdbId: number;
  history: HistoryState;
  onChange: (h: HistoryState) => void;
}) {
  const { pending, error, run } = useHistoryAction(onChange);
  const count = history.viewings.length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Historique{count > 1 ? ` · vu ${count} fois` : ""}
        </p>
        <button type="button" className="btn-ghost py-1.5" disabled={pending} onClick={() => run(() => logRewatch(tmdbId, null))}>
          {count ? "Revu aujourd'hui" : "Vu aujourd'hui"}
        </button>
      </div>
      {count > 0 ? (
        <ViewingList mediaType="movie" tmdbId={tmdbId} rows={history.viewings} pending={pending} run={run} />
      ) : (
        <p className="text-sm text-muted">Aucun visionnage daté.</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function EpisodeTracker({
  tmdbId,
  seasons,
  history,
  onChange,
  onFinished,
}: {
  tmdbId: number;
  seasons: Season[];
  history: HistoryState;
  onChange: (h: HistoryState) => void;
  /** Appelé quand « +1 épisode » dépasse le dernier épisode de la série. */
  onFinished: () => void;
}) {
  const { pending, error, run } = useHistoryAction(onChange);
  const [selected, setSelected] = useState(history.season ?? seasons[0]?.season_number ?? 1);

  const seen = seenSet(history, seasons);
  const season = seasons.find((s) => s.season_number === selected) ?? seasons[0];
  if (!season) return null;
  const episodes = Array.from({ length: season.episode_count }, (_, i) => i + 1);
  const seenInSeason = episodes.filter((e) => seen.has(`${season.season_number}:${e}`)).length;
  const total = seasons.reduce((n, s) => n + s.episode_count, 0);

  const mark = (list: Ep[], value: boolean) => run(() => markEpisodes(tmdbId, list, value));

  const toggle = (episode: number) => {
    const s = season.season_number;
    if (seen.has(`${s}:${episode}`)) return mark([{ season: s, episode }], false);
    // Cocher un épisode coche aussi ceux d'avant dans la saison.
    mark(
      episodes.filter((e) => e <= episode && !seen.has(`${s}:${e}`)).map((e) => ({ season: s, episode: e })),
      true,
    );
  };

  const next = () => {
    const ordered = seasons.flatMap((s) =>
      Array.from({ length: s.episode_count }, (_, i) => ({ season: s.season_number, episode: i + 1 })),
    );
    const at = history.season
      ? ordered.findIndex((e) => e.season === history.season && e.episode === history.episode)
      : -1;
    const target = ordered[at + 1];
    if (!target) return onFinished();
    setSelected(target.season);
    mark([target], true);
  };

  const recent = history.viewings.filter((v) => v.episode !== null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Épisodes · {seen.size} / {total} vus
        </p>
        <button type="button" className="btn-ghost py-1.5" disabled={pending} onClick={next}>
          +1 épisode
          {history.season ? <span className="text-muted">après {code(history)}</span> : null}
        </button>
      </div>

      {seasons.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {seasons.map((s) => (
            <button
              key={s.season_number}
              type="button"
              onClick={() => setSelected(s.season_number)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                s.season_number === season.season_number ? "bg-white/20 text-fg" : "bg-white/5 text-muted hover:text-fg"
              }`}
            >
              S{s.season_number}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {episodes.map((e) => {
          const on = seen.has(`${season.season_number}:${e}`);
          return (
            <button
              key={e}
              type="button"
              disabled={pending}
              onClick={() => toggle(e)}
              aria-pressed={on}
              aria-label={`Épisode ${e}${on ? " (vu)" : ""}`}
              className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold transition ${
                on ? "bg-accent text-accent-fg" : "bg-white/5 text-muted hover:bg-white/10 hover:text-fg"
              }`}
            >
              {e}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="text-muted">
          Saison {season.season_number} : {seenInSeason} / {season.episode_count}
        </span>
        {seenInSeason < season.episode_count ? (
          <button
            type="button"
            disabled={pending}
            className="text-accent hover:underline"
            onClick={() => mark(episodes.map((e) => ({ season: season.season_number, episode: e })), true)}
          >
            Toute la saison vue
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            className="text-muted hover:text-fg"
            onClick={() => mark(episodes.map((e) => ({ season: season.season_number, episode: e })), false)}
          >
            Tout décocher
          </button>
        )}
      </div>

      {recent.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted">
            Historique des épisodes
          </summary>
          <ViewingList mediaType="tv" tmdbId={tmdbId} rows={recent.slice(0, 50)} pending={pending} run={run} />
        </details>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
