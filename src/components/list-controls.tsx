"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createListAction, deleteListAction, renameListAction, toggleInList } from "@/app/actions";
import { CheckIcon, PlusIcon } from "@/components/icons";
import type { MediaType } from "@/lib/schema";

/** Formulaire « Nouvelle liste » de la page des listes. */
export function NewListForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex w-full max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const id = await createListAction(name);
            router.push(`/listes/${id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Impossible de créer la liste.");
          }
        });
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nouvelle liste, ex. « Films de Noël »"
        maxLength={80}
        className="input py-2 text-sm"
      />
      <button type="submit" className="btn-primary shrink-0" disabled={pending || !name.trim()}>
        Créer
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

/** Renommer ou supprimer une liste, depuis sa page. */
export function ListSettings({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await renameListAction(id, value);
            setEditing(false);
          });
        }}
      >
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} className="input py-1.5 text-sm" autoFocus />
        <button type="submit" className="btn-primary py-1.5" disabled={pending || !value.trim()}>
          OK
        </button>
      </form>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" className="btn-ghost py-1.5" onClick={() => setEditing(true)}>
        Renommer
      </button>
      <button
        type="button"
        className="btn-ghost py-1.5 hover:text-red-400"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Supprimer la liste « ${name} » ? Les titres restent dans ta bibliothèque.`)) return;
          startTransition(async () => {
            await deleteListAction(id);
            router.push("/listes");
          });
        }}
      >
        Supprimer
      </button>
    </div>
  );
}

export function RemoveFromListButton({ listId, mediaType, tmdbId }: { listId: number; mediaType: MediaType; tmdbId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="mt-1 text-xs text-muted hover:text-red-400"
      onClick={() => startTransition(() => toggleInList(listId, mediaType, tmdbId, false))}
    >
      Retirer de la liste
    </button>
  );
}

/** Sur la fiche d'un titre : cocher les listes où il figure, ou en créer une. */
export function ListPicker({
  mediaType,
  tmdbId,
  lists,
  initial,
}: {
  mediaType: MediaType;
  tmdbId: number;
  lists: { id: number; name: string }[];
  initial: number[];
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(lists);
  const [inLists, setInLists] = useState(new Set(initial));
  const [name, setName] = useState("");
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

  const toggle = (id: number) => {
    const next = new Set(inLists);
    const on = !next.has(id);
    if (on) next.add(id);
    else next.delete(id);
    setInLists(next);
    startTransition(() => toggleInList(id, mediaType, tmdbId, on));
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" className="btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <PlusIcon width={16} height={16} />
        {inLists.size ? `Dans ${inLists.size} liste${inLists.size > 1 ? "s" : ""}` : "Ajouter à une liste"}
      </button>
      {/* Ouvert vers le haut : le bandeau de la fiche coupe ce qui déborde en bas. */}
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-2xl border border-white/10 bg-surface-2/95 p-2 shadow-2xl backdrop-blur-xl">
          {all.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => toggle(l.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/10"
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                  inLists.has(l.id) ? "border-accent bg-accent text-accent-fg" : "border-white/20"
                }`}
              >
                {inLists.has(l.id) && <CheckIcon width={14} height={14} />}
              </span>
              <span className="line-clamp-1">{l.name}</span>
            </button>
          ))}
          <form
            className="mt-1 flex gap-2 border-t border-white/10 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const clean = name.trim();
              if (!clean) return;
              startTransition(async () => {
                const id = await createListAction(clean, { mediaType, tmdbId });
                setAll((a) => [...a, { id, name: clean }]);
                setInLists((s) => new Set([...s, id]));
                setName("");
              });
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nouvelle liste"
              maxLength={80}
              className="input px-3 py-1.5 text-sm"
            />
            <button type="submit" className="btn-primary px-3 py-1.5" disabled={pending || !name.trim()}>
              Créer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
