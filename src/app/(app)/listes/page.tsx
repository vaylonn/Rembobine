import Image from "next/image";
import Link from "next/link";
import { NewListForm } from "@/components/list-controls";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/poster-card";
import { listLists } from "@/lib/lists";
import { imageUrl } from "@/lib/tmdb";

export const metadata = { title: "Mes listes · Rembobine" };

export default async function ListsPage() {
  const lists = await listLists();

  return (
    <section className="space-y-6">
      <PageHeader title="Mes listes" subtitle="Regroupe des films et séries comme tu veux, qu'ils soient vus ou non.">
        <NewListForm />
      </PageHeader>

      {lists.length === 0 ? (
        <EmptyState>
          Aucune liste pour l&apos;instant. Crée-en une ici, ou depuis la fiche d&apos;un titre avec « Ajouter à une liste ».
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {lists.map((l) => (
            <Link key={l.id} href={`/listes/${l.id}`} className="group block">
              <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-white/5 transition group-hover:ring-2 group-hover:ring-accent/80">
                {Array.from({ length: 4 }, (_, i) => {
                  const src = imageUrl(l.posters[i] ?? null, "w185");
                  return (
                    <div key={i} className="relative bg-surface">
                      {src && <Image src={src} alt="" fill sizes="120px" className="object-cover" />}
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 line-clamp-1 font-medium transition group-hover:text-accent">{l.name}</p>
              <p className="text-xs text-muted">
                {l.count} titre{l.count > 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
