"use client";

import { useState, useTransition } from "react";
import { trackTitle, untrackTitle, type HistoryState } from "@/app/actions";
import { EpisodeTracker, MovieHistory } from "@/components/history-panel";
import { STATUS_LABELS } from "@/lib/labels";
import { STATUSES, type MediaType, type Status } from "@/lib/schema";

type Props = {
  mediaType: MediaType;
  tmdbId: number;
  initial: { status: Status; rating: number | null; season: number | null; episode: number | null } | null;
  seasons: { season_number: number; episode_count: number }[];
  history: HistoryState;
};

export function TrackPanel({ mediaType, tmdbId, initial, seasons, history: initialHistory }: Props) {
  const [state, setState] = useState(initial);
  const [history, setHistory] = useState(initialHistory);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (next: NonNullable<Props["initial"]>) => {
    const previous = state;
    setState(next);
    setError(null);
    startTransition(async () => {
      try {
        await trackTitle({ mediaType, tmdbId, ...next });
      } catch {
        setState(previous);
        setError("Impossible d'enregistrer. Réessaie.");
      }
    });
  };

  // L'historique fait foi pour la progression d'une série.
  const updateHistory = (next: HistoryState) => {
    setHistory(next);
    setState((s) =>
      s ? { ...s, season: next.season, episode: next.episode } : { status: "watching", rating: null, season: next.season, episode: next.episode },
    );
  };

  const remove = () => {
    const previous = state;
    setState(null);
    setHistory({ viewings: [], season: null, episode: null });
    startTransition(async () => {
      try {
        await untrackTitle(mediaType, tmdbId);
      } catch {
        setState(previous);
        setError("Impossible de retirer ce titre.");
      }
    });
  };

  const current = state ?? { status: "planned" as Status, rating: null, season: null, episode: null };

  return (
    <div className="max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-surface/70 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() =>
              save({
                ...current,
                status: s,
                season: mediaType === "tv" && s === "watching" && !current.season ? 1 : current.season,
              })
            }
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              state?.status === s
                ? "bg-accent text-accent-fg shadow-[0_6px_20px_-8px_rgba(245,176,65,0.6)]"
                : "bg-white/10 text-fg hover:bg-white/20"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {state && (
        <>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Ta note</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={pending}
                  onClick={() => save({ ...state, rating: state.rating === n ? null : n })}
                  className={`h-8 w-8 rounded-full text-sm font-semibold transition ${
                    state.rating !== null && n <= state.rating
                      ? "bg-accent text-accent-fg"
                      : "bg-white/5 text-muted hover:bg-white/10 hover:text-fg"
                  }`}
                  aria-label={`Noter ${n} sur 10`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {mediaType === "tv" && seasons.length > 0 && (
            <EpisodeTracker
              tmdbId={tmdbId}
              seasons={seasons}
              history={history}
              onChange={updateHistory}
              onFinished={() => save({ ...state, status: "watched" })}
            />
          )}

          {mediaType === "movie" && state.status === "watched" && (
            <MovieHistory tmdbId={tmdbId} history={history} onChange={updateHistory} />
          )}

          <button type="button" onClick={remove} disabled={pending} className="text-xs text-muted hover:text-red-400">
            Retirer de ma bibliothèque
          </button>
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
