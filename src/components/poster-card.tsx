import Image from "next/image";
import Link from "next/link";
import { MEDIA_LABELS, titleHref } from "@/lib/labels";
import type { MediaType } from "@/lib/schema";
import { imageUrl } from "@/lib/tmdb";

export type PosterCardProps = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: number | null;
  badge?: string;
  note?: string;
};

export function PosterCard({ id, mediaType, title, posterPath, year, badge, note }: PosterCardProps) {
  const src = imageUrl(posterPath);
  return (
    <Link href={titleHref({ mediaType, id })} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2">
        {src ? (
          <Image
            src={src}
            alt={title}
            fill
            sizes="(min-width: 1024px) 180px, 40vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted">
            {title}
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-accent">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-1 text-sm font-medium">{title}</p>
      <p className="line-clamp-1 text-xs text-muted">
        {note ?? [MEDIA_LABELS[mediaType], year].filter(Boolean).join(" · ")}
      </p>
    </Link>
  );
}

export function PosterGrid({ items }: { items: (PosterCardProps & { key?: string })[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <PosterCard key={`${item.mediaType}:${item.id}`} {...item} />
      ))}
    </div>
  );
}

export function Shelf({
  title,
  href,
  items,
  empty,
}: {
  title: string;
  href?: string;
  items: PosterCardProps[];
  empty?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-muted hover:text-fg">
            Tout voir →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">{empty}</div>
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
          {items.map((item) => (
            <div key={`${item.mediaType}:${item.id}`} className="w-32 shrink-0 snap-start sm:w-40">
              <PosterCard {...item} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
