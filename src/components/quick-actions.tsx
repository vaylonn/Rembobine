"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { dismissTitle, quickAdd, undismissTitle } from "@/app/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";
import type { MediaType } from "@/lib/schema";

export type QuickActionsKind = "add" | "reco";

type Props = {
  kind: QuickActionsKind;
  mediaType: MediaType;
  id: number;
  title: string;
  children: React.ReactNode;
};

/** Affiche + petit menu pour ajouter (ou masquer) un titre sans ouvrir sa fiche. */
export function QuickActions({ kind, mediaType, id, title, children }: Props) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<"planned" | "watched" | "dismissed" | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const act = (next: NonNullable<typeof done>, action: () => Promise<void>) => {
    setOpen(false);
    setError(false);
    setDone(next);
    startTransition(async () => {
      try {
        await action();
      } catch {
        setDone(null);
        setError(true);
      }
    });
  };

  const undo = () => {
    setDone(null);
    startTransition(async () => {
      try {
        await undismissTitle(mediaType, id);
      } catch {
        setDone("dismissed");
      }
    });
  };

  if (done === "dismissed") {
    return (
      <div className="relative">
        <div className="pointer-events-none opacity-25 grayscale">{children}</div>
        <div className="absolute inset-x-0 top-0 grid aspect-[2/3] place-items-center p-3 text-center">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Masqué</p>
            <button
              type="button"
              disabled={pending}
              className="text-accent hover:underline"
              onClick={undo}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  }

  const added = done === "planned" || done === "watched";
  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-white/10";

  return (
    <div ref={ref} className="relative">
      {children}
      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          disabled={pending || added}
          onClick={() => setOpen((o) => !o)}
          aria-label={added ? `${title} ajouté` : `Ajouter ${title}`}
          aria-expanded={open}
          className={`grid h-8 w-8 place-items-center rounded-full shadow-lg backdrop-blur transition ${
            added ? "bg-accent text-accent-fg" : error ? "bg-red-500/80 text-white" : "bg-black/60 text-fg hover:bg-accent hover:text-accent-fg"
          }`}
        >
          {added ? <CheckIcon width={16} height={16} /> : <PlusIcon width={16} height={16} />}
        </button>
        {open && (
          <div className="absolute right-0 top-10 w-40 overflow-hidden rounded-xl border border-white/10 bg-surface-2/95 py-1 shadow-2xl backdrop-blur-xl">
            <button type="button" className={item} onClick={() => act("planned", () => quickAdd(mediaType, id, "planned"))}>
              À voir
            </button>
            <button type="button" className={item} onClick={() => act("watched", () => quickAdd(mediaType, id, "watched"))}>
              Déjà vu
            </button>
            {kind === "reco" && (
              <button
                type="button"
                className={`${item} text-muted`}
                onClick={() => act("dismissed", () => dismissTitle(mediaType, id))}
              >
                Pas intéressé
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
