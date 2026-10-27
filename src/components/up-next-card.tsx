"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { markEpisodes } from "@/app/actions";
import { CheckIcon } from "./icons";

export type UpNextCardProps = {
  tmdbId: number;
  title: string;
  href: string;
  image: string | null;
  /** Prochain épisode à voir ; sans lui, la carte renvoie seulement vers la fiche. */
  next: { season: number; episode: number } | null;
  behind: number;
  /** Part de la série déjà vue, de 0 à 1. */
  progress: number | null;
  note: string;
};

function code(e: { season: number; episode: number }) {
  return `S${e.season} · É${e.episode}`;
}

/** Série à reprendre : on coche l'épisode suivant sans ouvrir la fiche. */
export function UpNextCard({ tmdbId, title, href, image, next, behind, progress, note }: UpNextCardProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const markSeen = () => {
    if (!next) return;
    setError(false);
    startTransition(async () => {
      try {
        // L'action rafraîchit la page : la carte affiche ensuite l'épisode suivant.
        await markEpisodes(tmdbId, [next], true);
      } catch {
        setError(true);
      }
    });
  };

  return (
    <div className="group relative w-64 shrink-0 snap-start sm:w-80">
      <Link href={href} className="block outline-none">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/5 transition group-hover:ring-2 group-hover:ring-accent/80 group-focus-visible:ring-2 group-focus-visible:ring-accent">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 640px) 320px, 256px"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center font-display text-muted">{title}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute inset-x-3 bottom-3 pr-12">
            <p className="line-clamp-1 font-display text-base font-semibold drop-shadow">{title}</p>
            <p className="text-xs text-fg/80">{note}</p>
          </div>
          {progress !== null && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
              <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
        </div>
      </Link>
      {next && (
        <button
          type="button"
          onClick={markSeen}
          disabled={pending}
          title={`Marquer ${code(next)} comme vu`}
          aria-label={`Marquer ${title} ${code(next)} comme vu`}
          className={`absolute bottom-4 right-3 grid h-10 w-10 place-items-center rounded-full shadow-lg transition active:scale-95 disabled:opacity-60 ${
            error ? "bg-red-500 text-white" : "bg-accent text-accent-fg hover:brightness-110"
          }`}
        >
          {pending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <CheckIcon width={20} height={20} />
          )}
        </button>
      )}
      {behind > 1 && (
        <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold backdrop-blur">
          {behind} à voir
        </span>
      )}
    </div>
  );
}
