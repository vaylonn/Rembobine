import Image from "next/image";
import { notFound } from "next/navigation";
import { EmptyState, PosterGrid } from "@/components/poster-card";
import { formatRating, STATUS_LABELS } from "@/lib/labels";
import { listEntries } from "@/lib/library";
import { getPerson, imageUrl, type PersonCredit } from "@/lib/tmdb";

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function PersonPage({ params }: PageProps<"/personne/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [person, library] = await Promise.all([getPerson(id), listEntries()]);
  if (!person) notFound();

  const entries = new Map(library.map((e) => [`${e.mediaType}:${e.tmdbId}`, e]));
  const cards = (items: PersonCredit[]) =>
    items
      .filter((t) => t.posterPath)
      .map((t) => {
        const entry = entries.get(`${t.mediaType}:${t.id}`);
        return {
          ...t,
          badge: entry ? (entry.rating ? `★ ${formatRating(entry.rating)}` : STATUS_LABELS[entry.status]) : undefined,
          note: [t.year, t.role].filter(Boolean).join(" · ") || undefined,
          actions: entry ? undefined : ("add" as const),
        };
      });

  const seen = [...person.acting, ...person.directing].filter((t) => entries.has(`${t.mediaType}:${t.id}`));
  const uniqueSeen = new Set(seen.map((t) => `${t.mediaType}:${t.id}`)).size;
  const photo = imageUrl(person.profilePath, "w500");
  // Les réalisateurs d'abord par leurs réalisations, les acteurs par leurs rôles.
  const directingFirst = person.department === "Directing" || person.department === "Writing";
  const sections = [
    { title: "Réalisation et création", items: cards(person.directing) },
    { title: "Rôles", items: cards(person.acting) },
  ];
  if (!directingFirst) sections.reverse();

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/10 sm:w-52">
          {photo ? (
            <Image src={photo} alt={person.name} fill sizes="208px" className="object-cover" priority />
          ) : (
            <span className="grid h-full place-items-center font-display text-5xl text-muted">{person.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <h1 className="font-display text-4xl font-bold tracking-tight">{person.name}</h1>
          <p className="text-sm text-muted">
            {[
              person.birthday ? `Né(e) le ${DATE.format(new Date(person.birthday))}` : null,
              person.placeOfBirth,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {uniqueSeen > 0 && (
            <p className="inline-block rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
              {uniqueSeen} titre{uniqueSeen > 1 ? "s" : ""} dans ta bibliothèque
            </p>
          )}
          {person.biography && (
            <p className="line-clamp-[8] max-w-3xl whitespace-pre-line text-sm leading-relaxed text-fg/85">
              {person.biography}
            </p>
          )}
        </div>
      </div>

      {sections.map((s) =>
        s.items.length ? (
          <section key={s.title} className="space-y-4">
            <h2 className="section-title">{s.title}</h2>
            <PosterGrid items={s.items.slice(0, 36)} />
          </section>
        ) : null,
      )}
      {sections.every((s) => !s.items.length) && <EmptyState>Aucun titre connu pour cette personne.</EmptyState>}
    </section>
  );
}
