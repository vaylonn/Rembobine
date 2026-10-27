import Link from "next/link";
import { PosterGrid } from "@/components/poster-card";
import { MEDIA_LABELS, STATUS_LABELS } from "@/lib/labels";
import { listEntries } from "@/lib/library";
import { MEDIA_TYPES, STATUSES, type Entry, type MediaType, type Status } from "@/lib/schema";

export const metadata = { title: "Bibliothèque · Rembobine" };

const PAGE_SIZE = 48;

const SORTS = {
  recent: { label: "Modifiés récemment", compare: (a: Entry, b: Entry) => +b.updatedAt - +a.updatedAt },
  ajout: { label: "Ajoutés récemment", compare: (a: Entry, b: Entry) => +b.createdAt - +a.createdAt },
  note: { label: "Note", compare: (a: Entry, b: Entry) => (b.rating ?? 0) - (a.rating ?? 0) },
  titre: { label: "Titre", compare: (a: Entry, b: Entry) => a.title.localeCompare(b.title, "fr") },
  annee: { label: "Année", compare: (a: Entry, b: Entry) => (b.year ?? 0) - (a.year ?? 0) },
} as const;
type Sort = keyof typeof SORTS;
const SORT_KEYS = Object.keys(SORTS) as Sort[];

/** Minuscules sans accents, pour chercher « amelie » et trouver « Amélie ». */
function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function pick<T extends string>(value: unknown, allowed: readonly T[]) {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function Filter({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-sm ${
        active ? "border-accent bg-accent text-accent-fg" : "border-border text-muted hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );
}

export default async function LibraryPage({ searchParams }: PageProps<"/bibliotheque">) {
  const params = await searchParams;
  const type = pick<MediaType>(params.type, MEDIA_TYPES);
  const status = pick<Status>(params.statut, STATUSES);
  const sort = pick<Sort>(params.tri, SORT_KEYS) ?? "recent";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const requestedPage = Math.max(1, Math.floor(Number(params.page)) || 1);

  const all = await listEntries();
  const needle = fold(q);
  const items = all
    .filter(
      (e) =>
        (!type || e.mediaType === type) &&
        (!status || e.status === status) &&
        (!needle || fold(e.title).includes(needle)),
    )
    .sort(SORTS[sort].compare);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const shown = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  type Params = { type?: MediaType; statut?: Status; tri?: Sort; q?: string; page?: number };
  const current: Params = { type, statut: status, tri: sort, q };
  const href = (changes: Params) => {
    // Changer un filtre ramène à la première page.
    const next = { ...current, page: undefined, ...changes };
    const qs = new URLSearchParams();
    if (next.type) qs.set("type", next.type);
    if (next.statut) qs.set("statut", next.statut);
    if (next.tri && next.tri !== "recent") qs.set("tri", next.tri);
    if (next.q) qs.set("q", next.q);
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    const s = qs.toString();
    return s ? `/bibliotheque?${s}` : "/bibliotheque";
  };

  const watched = all.filter((e) => e.status === "watched");
  const rated = all.filter((e) => e.rating !== null);
  const avg = rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">Bibliothèque</h1>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted">Films vus</dt>
            <dd className="text-lg font-semibold">{watched.filter((e) => e.mediaType === "movie").length}</dd>
          </div>
          <div>
            <dt className="text-muted">Séries vues</dt>
            <dd className="text-lg font-semibold">{watched.filter((e) => e.mediaType === "tv").length}</dd>
          </div>
          <div>
            <dt className="text-muted">Note moyenne</dt>
            <dd className="text-lg font-semibold">{avg ? avg.toFixed(1) : "–"}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <Filter label="Tout" active={!type} href={href({ type: undefined })} />
        {MEDIA_TYPES.map((t) => (
          <Filter key={t} label={`${MEDIA_LABELS[t]}s`} active={type === t} href={href({ type: t })} />
        ))}
        <span className="mx-1 w-px bg-border" />
        <Filter label="Tous statuts" active={!status} href={href({ statut: undefined })} />
        {STATUSES.map((s) => (
          <Filter key={s} label={STATUS_LABELS[s]} active={status === s} href={href({ statut: s })} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action="/bibliotheque" className="w-full sm:w-64">
          {type && <input type="hidden" name="type" value={type} />}
          {status && <input type="hidden" name="statut" value={status} />}
          {sort !== "recent" && <input type="hidden" name="tri" value={sort} />}
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Chercher dans ma bibliothèque…"
            className="input py-1.5 text-sm"
          />
        </form>
        <span className="text-sm text-muted sm:ml-2">Trier :</span>
        {SORT_KEYS.map((k) => (
          <Filter key={k} label={SORTS[k].label} active={sort === k} href={href({ tri: k })} />
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          {q
            ? `Aucun titre ne correspond à « ${q} ».`
            : "Rien ici pour l'instant. Utilise la recherche pour ajouter des titres."}
        </p>
      ) : (
        <PosterGrid
          items={shown.map((e) => ({
            id: e.tmdbId,
            mediaType: e.mediaType,
            title: e.title,
            posterPath: e.posterPath,
            year: e.year,
            badge: e.rating ? `★ ${e.rating}` : undefined,
            note:
              e.mediaType === "tv" && e.status === "watching" && e.season
                ? `En cours · S${e.season} É${e.episode ?? 0}`
                : `${STATUS_LABELS[e.status]}${e.year ? ` · ${e.year}` : ""}`,
          }))}
        />
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="text-muted hover:text-fg">
              ← Précédent
            </Link>
          ) : (
            <span className="text-muted opacity-40">← Précédent</span>
          )}
          <span>
            Page {page} sur {pageCount} · {items.length} titres
          </span>
          {page < pageCount ? (
            <Link href={href({ page: page + 1 })} className="text-muted hover:text-fg">
              Suivant →
            </Link>
          ) : (
            <span className="text-muted opacity-40">Suivant →</span>
          )}
        </nav>
      )}
    </section>
  );
}
