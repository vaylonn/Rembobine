"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { houseflixAccess, houseflixStreamToken } from "@/app/actions";
import { PlayIcon } from "@/components/icons";
import type { MediaType } from "@/lib/schema";

type JellyfinItem = { id: string; url: string | null };
type Queue = { items: number; progress: number; status: string; timeLeft: string | null };
type Status =
  | { state: "missing" | "wanted" | "importing" }
  | { state: "downloading"; queue: Queue }
  | { state: "available"; jellyfin: JellyfinItem }
  | {
      state: "missing" | "wanted" | "downloading" | "available";
      episodes: { downloaded: number; total: number };
      queue: Queue | null;
      jellyfin: JellyfinItem | null;
    };

type Access = { url: string; token: string; at: number };

const POLL = 10_000;

export function HouseflixPanel({ mediaType, tmdbId, tvdbId }: { mediaType: MediaType; tmdbId: number; tvdbId: number | null }) {
  const access = useRef<Access | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<string | null>(null);
  const [playError, setPlayError] = useState(false);

  // Le jeton dure 15 minutes : on le renouvelle avant.
  const call = useCallback(async (path: string, init?: RequestInit) => {
    if (!access.current || access.current.at < Date.now() - 10 * 60_000) {
      const fresh = await houseflixAccess();
      if (!fresh) throw new Error("HouseFlix n'est pas configuré.");
      access.current = { ...fresh, at: Date.now() };
    }
    const res = await fetch(access.current.url + path, {
      ...init,
      headers: { Authorization: `Bearer ${access.current.token}`, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
    return data;
  }, []);

  const query = mediaType === "movie" ? `type=movie&tmdbId=${tmdbId}` : `type=tv&tmdbId=${tmdbId}&tvdbId=${tvdbId}`;

  const refresh = useCallback(async () => {
    if (mediaType === "tv" && !tvdbId) return;
    try {
      setStatus(await call(`/status?${query}`));
      setUnreachable(false);
    } catch (e) {
      // Un échec réseau veut dire que l'appareil n'est pas sur Tailscale (ou que le Pi est éteint).
      if (e instanceof TypeError) setUnreachable(true);
      else setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }, [call, query, mediaType, tvdbId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- premier chargement depuis le Pi
    refresh();
  }, [refresh]);

  const busy = status?.state === "downloading" || status?.state === "importing" || status?.state === "wanted";
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(refresh, POLL);
    return () => clearInterval(timer);
  }, [busy, refresh]);

  if (mediaType === "tv" && !tvdbId) return null;

  if (unreachable) {
    return <p className="text-xs text-muted">HouseFlix injoignable : active Tailscale pour télécharger ou regarder.</p>;
  }
  if (!status) return null;

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      await call("/request", { method: "POST", body: JSON.stringify({ type: mediaType, tmdbId, tvdbId }) });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setPending(false);
    }
  };

  const play = async (item: JellyfinItem) => {
    setPlayError(false);
    const token = await houseflixStreamToken(item.id);
    setPlayer(`${access.current!.url}/stream/${item.id}?t=${encodeURIComponent(token)}`);
  };

  const jellyfin = "jellyfin" in status ? status.jellyfin : null;
  const queue = "queue" in status ? status.queue : null;
  const episodes = "episodes" in status ? status.episodes : null;

  return (
    <div className="max-w-3xl space-y-3 rounded-2xl border border-white/10 bg-surface/70 p-4 backdrop-blur-xl sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">HouseFlix</p>

      <div className="flex flex-wrap items-center gap-2">
        {mediaType === "movie" && jellyfin && (
          <button type="button" onClick={() => play(jellyfin)} className="btn-primary">
            <PlayIcon /> Regarder
          </button>
        )}
        {jellyfin?.url && (
          <a href={jellyfin.url} target="_blank" rel="noreferrer" className="btn-ghost">
            Ouvrir dans Jellyfin
          </a>
        )}
        {status.state === "missing" && (
          <button type="button" disabled={pending} onClick={download} className="btn-primary">
            {pending ? "Envoi…" : mediaType === "movie" ? "Télécharger" : "Télécharger la série"}
          </button>
        )}
        {status.state === "wanted" && (
          <>
            <span className="text-sm text-fg/80">En attente d&apos;une source…</span>
            <button type="button" disabled={pending} onClick={download} className="btn-ghost">
              Relancer la recherche
            </button>
          </>
        )}
        {status.state === "importing" && <span className="text-sm text-fg/80">Téléchargé, import dans Jellyfin…</span>}
        {episodes && status.state !== "missing" && (
          <span className="text-sm text-fg/80">
            {episodes.downloaded} / {episodes.total} épisodes téléchargés
          </span>
        )}
      </div>

      {queue && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${queue.progress}%` }} />
          </div>
          <p className="text-xs text-muted">
            Téléchargement : {queue.progress} %{queue.items > 1 && ` (${queue.items} fichiers)`}
            {queue.timeLeft && ` · encore ${queue.timeLeft}`}
          </p>
        </div>
      )}

      {player && (
        <div className="space-y-2">
          <video
            src={player}
            controls
            autoPlay
            playsInline
            onError={() => setPlayError(true)}
            className="aspect-video w-full rounded-xl bg-black"
          />
          {playError && (
            <p className="text-sm text-fg/80">
              Ce format n&apos;est pas lisible dans le navigateur (souvent un .mkv). Ouvre-le plutôt dans Jellyfin.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
