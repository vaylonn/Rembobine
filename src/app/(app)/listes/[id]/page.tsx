import Link from "next/link";
import { notFound } from "next/navigation";
import { ListSettings, RemoveFromListButton } from "@/components/list-controls";
import { PageHeader } from "@/components/page-header";
import { EmptyState, PosterCard } from "@/components/poster-card";
import { formatRating } from "@/lib/labels";
import { listEntries } from "@/lib/library";
import { getList } from "@/lib/lists";

export default async function ListPage({ params }: PageProps<"/listes/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [list, library] = await Promise.all([getList(id), listEntries()]);
  if (!list) notFound();

  const entries = new Map(library.map((e) => [`${e.mediaType}:${e.tmdbId}`, e]));

  return (
    <section className="space-y-6">
      <Link href="/listes" className="text-sm text-muted hover:text-fg">
        ← Mes listes
      </Link>
      <PageHeader title={list.name} subtitle={`${list.items.length} titre${list.items.length > 1 ? "s" : ""}`}>
        <ListSettings id={list.id} name={list.name} />
      </PageHeader>

      {list.items.length === 0 ? (
        <EmptyState>Liste vide. Ouvre la fiche d&apos;un film ou d&apos;une série et choisis « Ajouter à une liste ».</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-6">
          {list.items.map((item) => {
            const entry = entries.get(`${item.mediaType}:${item.tmdbId}`);
            return (
              <div key={`${item.mediaType}:${item.tmdbId}`}>
                <PosterCard
                  id={item.tmdbId}
                  mediaType={item.mediaType}
                  title={item.title}
                  posterPath={item.posterPath}
                  year={item.year}
                  badge={entry?.rating ? `★ ${formatRating(entry.rating)}` : undefined}
                  actions={entry ? undefined : "add"}
                />
                <RemoveFromListButton listId={list.id} mediaType={item.mediaType} tmdbId={item.tmdbId} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
