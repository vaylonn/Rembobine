"use client";

import { useState, useTransition } from "react";
import { saveNotes } from "@/app/actions";
import type { MediaType } from "@/lib/schema";

/** Avis ou notes perso, enregistrés quand on quitte le champ. */
export function NotesField({ mediaType, tmdbId, initial }: { mediaType: MediaType; tmdbId: number; initial: string | null }) {
  const [saved, setSaved] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        Ton avis
        <span className="normal-case tracking-normal">
          {pending ? "Enregistrement…" : status === "saved" ? "Enregistré" : status === "error" ? "Échec, réessaie" : ""}
        </span>
      </span>
      <textarea
        defaultValue={saved}
        rows={3}
        maxLength={5000}
        placeholder="Ce que tu en as pensé, avec qui tu l'as vu…"
        className="w-full resize-y rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none transition placeholder:text-muted focus:border-accent focus:bg-surface-2"
        onBlur={(e) => {
          const value = e.target.value;
          if (value.trim() === saved.trim()) return;
          startTransition(async () => {
            try {
              await saveNotes(mediaType, tmdbId, value);
              setSaved(value);
              setStatus("saved");
            } catch {
              setStatus("error");
            }
          });
        }}
      />
    </label>
  );
}
