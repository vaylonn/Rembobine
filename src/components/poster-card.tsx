import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon, StarIcon } from "@/components/icons";
import { QuickActions, type QuickActionsKind } from "@/components/quick-actions";
import { ScrollRow } from "@/components/scroll-row";
import { MEDIA_LABELS, titleHref } from "@/lib/labels";
import type { MediaType } from "@/lib/schema";
import { imageUrl } from "@/lib/tmdb";

export type PosterCardProps = {
  id: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  year: number | null;
  voteAverage?: number;
  badge?: string;
  note?: string;
  /** Bouton d'ajout rapide sur l'affiche ; « reco » permet aussi de masquer le titre. */
  actions?: QuickActionsKind;
};

function Meta({ mediaType, year, voteAverage }: Pick<PosterCardProps, "mediaType" | "year" | "voteAverage">) {
  return (
    <span className="flex items-center gap-1.5">
      {[year, MEDIA_LABELS[mediaType]].filter(Boolean).join(" · ")}
      {voteAverage ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-0.5 text-accent">
            <StarIcon width={11} height={11} />
            {voteAverage.toFixed(1)}
          </span>
        </>
      ) : null}
    </span>
  );
}

export function PosterCard({ actions, ...props }: PosterCardProps) {
  const card = <PosterLink {...props} />;
  if (!actions) return card;
  return (
    <QuickActions kind={actions} mediaType={props.mediaType} id={props.id} title={props.title}>
      {card}
    </QuickActions>
  );
}

function PosterLink({ id, mediaType, title, posterPath, year, voteAverage, badge, note }: Omit<PosterCardProps, "actions">) {
  const src = imageUrl(posterPath);
  return (
    <Link href={titleHref({ mediaType, id })} className="group block outline-none">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-2 ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-accent/80 group-hover:shadow-[0_12px_40px_-12px_rgba(245,176,65,0.35)] group-focus-visible:ring-2 group-focus-visible:ring-accent">
        {src ? (
          <Image
            src={src}
            alt={title}
            fill
            sizes="(min-width: 1024px) 200px, 40vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-display text-sm text-muted">
            {title}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        {badge && (
          <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-fg shadow">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2.5 line-clamp-1 text-sm font-medium transition group-hover:text-accent">{title}</p>
      <p className="line-clamp-1 text-xs text-muted">
        {note ?? <Meta mediaType={mediaType} year={year} voteAverage={voteAverage} />}
      </p>
    </Link>
  );
}

export function PosterGrid({ items }: { items: PosterCardProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <PosterCard key={`${item.mediaType}:${item.id}`} {...item} />
      ))}
    </div>
  );
}

function ShelfHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="section-title">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-muted transition hover:text-accent"
        >
          Tout voir
          <ChevronRightIcon width={16} height={16} />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-sm text-muted">
      {children}
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
  if (items.length === 0 && !empty) return null;
  return (
    <section className="space-y-4">
      <ShelfHeader title={title} href={href} />
      {items.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ScrollRow>
          {items.map((item) => (
            <div key={`${item.mediaType}:${item.id}`} className="w-32 shrink-0 snap-start sm:w-40 lg:w-44">
              <PosterCard {...item} />
            </div>
          ))}
        </ScrollRow>
      )}
    </section>
  );
}

/** Classement façon « Top 10 » : grand numéro à côté de l'affiche. */
export function RankedShelf({ title, href, items }: { title: string; href?: string; items: PosterCardProps[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <ShelfHeader title={title} href={href} />
      <ScrollRow>
        {items.map((item, i) => (
          <div key={`${item.mediaType}:${item.id}`} className="flex shrink-0 snap-start items-end">
            <span
              aria-hidden="true"
              className="-mr-2 mb-12 shrink-0 select-none font-display text-[4.5rem] font-black leading-none tracking-normal text-transparent [-webkit-text-stroke:2px_#4a4a58] sm:-mr-3 sm:text-[6rem]"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="relative w-32 sm:w-40 lg:w-44">
              <PosterCard {...item} />
            </div>
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
