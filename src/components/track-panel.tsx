"use client";

import { useState, useTransition } from "react";
import { trackTitle, untrackTitle } from "@/app/actions";
import { STATUS_LABELS } from "@/lib/labels";
import { STATUSES, type MediaType, type Status } from "@/lib/schema";

type Props = {
  mediaType: MediaType;
  tmdbId: number;
  initial: { status: Status; rating: number | null; season: number | null; episode: number | null } | null;
  seasons: { season_number: number; episode_count: number }[];
};

export function TrackPanel({ mediaType, tmdbId, initial, seasons }: Props) {
  const [state, setState] = useState(initial);
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

  const remove = () => {
    const previous = state;
    setState(null);
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
  const maxEpisodes = seasons.find((s) => s.season_number === current.season)?.episode_count;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
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
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              state?.status === s
                ? "bg-accent text-accent-fg"
                : "border border-border text-fg hover:bg-surface-2"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {state && (
        <>
          <div>
            <p className="mb-2 text-sm text-muted">Ta note</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={pending}
                  onClick={() => save({ ...state, rating: state.rating === n ? null : n })}
                  className={`h-8 w-8 rounded-md text-sm font-semibold transition ${
                    state.rating !== null && n <= state.rating
                      ? "bg-accent text-accent-fg"
                      : "bg-surface-2 text-muted hover:text-fg"
                  }`}
                  aria-label={`Noter ${n} sur 10`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {mediaType === "tv" && seasons.length > 0 && (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Saison</span>
                <select
                  className="input w-28"
                  value={state.season ?? ""}
                  disabled={pending}
                  onChange={(e) =>
                    save({ ...state, season: e.target.value ? Number(e.target.value) : null, episode: 0 })
                  }
                >
                  <option value="">–</option>
                  {seasons.map((s) => (
                    <option key={s.season_number} value={s.season_number}>
                      {s.season_number}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted">Dernier épisode vu</span>
                <input
                  type="number"
                  min={0}
                  max={maxEpisodes}
                  className="input w-28"
                  disabled={pending || !state.season}
                  key={`${state.season}-${state.episode}`}
                  defaultValue={state.episode ?? 0}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value !== state.episode) save({ ...state, episode: value });
                  }}
                />
              </label>
              {state.season && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => {
                    const ep = (state.episode ?? 0) + 1;
                    if (maxEpisodes && ep > maxEpisodes) {
                      const hasNext = seasons.some((s) => s.season_number === (state.season ?? 0) + 1);
                      if (hasNext) save({ ...state, season: (state.season ?? 0) + 1, episode: 1 });
                      else save({ ...state, status: "watched" });
                    } else {
                      save({ ...state, episode: ep });
                    }
                  }}
                >
                  +1 épisode
                </button>
              )}
              {maxEpisodes && <span className="pb-2 text-xs text-muted">sur {maxEpisodes}</span>}
            </div>
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
