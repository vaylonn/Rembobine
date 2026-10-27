import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PosterGrid } from "@/components/poster-card";
import { MEDIA_LABELS, STATUS_LABELS, formatRating } from "@/lib/labels";
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
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active ? "bg-fg text-bg" : "bg-white/5 text-muted hover:bg-white/10 hover:text-fg"
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
      <PageHeader title="Bibliothèque">
        <dl className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: "Films vus", value: watched.filter((e) => e.mediaType === "movie").length },
            { label: "Séries vues", value: watched.filter((e) => e.mediaType === "tv").length },
            { label: "Note moyenne", value: avg ? formatRating(Math.round(avg * 10) / 10) : "–" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/5 bg-surface px-4 py-3">
              <dt className="text-xs text-muted">{stat.label}</dt>
              <dd className="font-display text-2xl font-bold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Link href="/listes" className="btn-ghost py-1.5">
          Mes listes
        </Link>
        <Link href="/stats" className="btn-ghost py-1.5">
          Stats et bilan de l&apos;année
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Filter label="Tout" active={!type} href={href({ type: undefined })} />
        {MEDIA_TYPES.map((t) => (
          <Filter key={t} label={`${MEDIA_LABELS[t]}s`} active={type === t} href={href({ type: t })} />
        ))}
        <span className="mx-1 w-px self-stretch bg-border" />
        <Filter label="Tous statuts" active={!status} href={href({ statut: undefined })} />
        {STATUSES.map((s) => (
          <Filter key={s} label={STATUS_LABELS[s]} active={status === s} href={href({ statut: s })} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form action="/bibliotheque" className="relative w-full sm:w-72">
          {type && <input type="hidden" name="type" value={type} />}
          {status && <input type="hidden" name="statut" value={status} />}
          {sort !== "recent" && <input type="hidden" name="tri" value={sort} />}
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted" width={16} height={16} />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Chercher dans ma bibliothèque…"
            className="input py-1.5 pl-10 text-sm"
          />
        </form>
        <span className="text-sm text-muted sm:ml-2">Trier :</span>
        {SORT_KEYS.map((k) => (
          <Filter key={k} label={SORTS[k].label} active={sort === k} href={href({ tri: k })} />
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState>
          {q
            ? `Aucun titre ne correspond à « ${q} ».`
            : "Rien ici pour l'instant. Utilise la recherche pour ajouter des titres."}
        </EmptyState>
      ) : (
        <PosterGrid
          items={shown.map((e) => ({
            id: e.tmdbId,
            mediaType: e.mediaType,
            title: e.title,
            posterPath: e.posterPath,
            year: e.year,
            badge: e.rating ? `★ ${formatRating(e.rating)}` : undefined,
            note:
              e.mediaType === "tv" && e.status === "watching" && e.season
                ? `En cours · S${e.season} É${e.episode ?? 0}`
                : `${STATUS_LABELS[e.status]}${e.year ? ` · ${e.year}` : ""}`,
          }))}
        />
      )}

      {pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="btn-ghost">
              <ChevronLeftIcon width={16} height={16} />
              Précédent
            </Link>
          ) : (
            <span className="btn-ghost pointer-events-none opacity-40">
              <ChevronLeftIcon width={16} height={16} />
              Précédent
            </span>
          )}
          <span className="px-2 text-muted">
            Page {page} sur {pageCount} · {items.length} titres
          </span>
          {page < pageCount ? (
            <Link href={href({ page: page + 1 })} className="btn-ghost">
              Suivant
              <ChevronRightIcon width={16} height={16} />
            </Link>
          ) : (
            <span className="btn-ghost pointer-events-none opacity-40">
              Suivant
              <ChevronRightIcon width={16} height={16} />
            </span>
          )}
        </nav>
      )}
    </section>
  );
}
