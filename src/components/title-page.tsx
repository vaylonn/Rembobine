import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StarIcon } from "@/components/icons";
import { Shelf } from "@/components/poster-card";
import { ScrollRow } from "@/components/scroll-row";
import { ListPicker } from "@/components/list-controls";
import { TrackPanel } from "@/components/track-panel";
import { MEDIA_LABELS } from "@/lib/labels";
import { listViewings } from "@/lib/history";
import { getEntry, listEntries } from "@/lib/library";
import { listLists, listsContaining } from "@/lib/lists";
import type { MediaType } from "@/lib/schema";
import { getDetails, getRecommendationsFor, imageUrl, type Provider } from "@/lib/tmdb";

function Providers({ label, items }: { label: string; items: Provider[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <Image
            key={p.provider_id}
            src={imageUrl(p.logo_path, "w185")!}
            alt={p.provider_name}
            title={p.provider_name}
            width={40}
            height={40}
            className="rounded-lg ring-1 ring-white/10"
          />
        ))}
      </div>
    </div>
  );
}

export async function TitlePage({ mediaType, rawId }: { mediaType: MediaType; rawId: string }) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [details, entry, similar, library, viewings, lists, inLists] = await Promise.all([
    getDetails(mediaType, id),
    getEntry(mediaType, id),
    getRecommendationsFor(mediaType, id).catch(() => []),
    listEntries(),
    listViewings({ mediaType, tmdbId: id }),
    listLists(),
    listsContaining(mediaType, id),
  ]);
  if (!details) notFound();

  const owned = new Set(library.map((e) => `${e.mediaType}:${e.tmdbId}`));
  const backdrop = imageUrl(details.backdropPath, "w1280");
  const poster = imageUrl(details.posterPath, "w500");
  const facts = [
    MEDIA_LABELS[mediaType],
    details.year,
    details.runtime ? `${details.runtime} min${mediaType === "tv" ? " / ép." : ""}` : null,
    mediaType === "tv" && details.seasons.length
      ? `${details.seasons.length} saison${details.seasons.length > 1 ? "s" : ""}`
      : null,
  ].filter((f): f is string | number => !!f);

  return (
    <>
      <section className="full-bleed relative -mt-[calc(6rem+env(safe-area-inset-top))] overflow-hidden">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-black/50" />

        <div className="container-page relative flex flex-col gap-8 pb-6 pt-28 sm:flex-row sm:pt-40">
          <div className="relative aspect-[2/3] w-40 shrink-0 self-start overflow-hidden rounded-2xl bg-surface-2 shadow-2xl ring-1 ring-white/10 sm:w-60">
            {poster && <Image src={poster} alt={details.title} fill priority sizes="240px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{details.title}</h1>
              {details.tagline && <p className="italic text-fg/70">{details.tagline}</p>}
              {details.directors.length > 0 && (
                <p className="text-sm text-fg/80">
                  {mediaType === "tv" ? "Création" : "Réalisation"} :{" "}
                  {details.directors.map((d, i) => (
                    <span key={d.id}>
                      {i > 0 && ", "}
                      <Link href={`/personne/${d.id}`} className="font-medium text-fg underline-offset-4 hover:text-accent hover:underline">
                        {d.name}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg/80">
                {details.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-accent">
                    <StarIcon />
                    {details.voteAverage.toFixed(1)}
                  </span>
                )}
                {facts.map((f) => (
                  <span key={f} className="before:mr-2 before:text-fg/40 before:content-['•'] first:before:hidden">
                    {f}
                  </span>
                ))}
              </p>
              <div className="flex flex-wrap gap-2">
                {details.genres.map((g) => (
                  <span key={g.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-fg/80 backdrop-blur">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            {details.overview && <p className="max-w-3xl leading-relaxed text-fg/85">{details.overview}</p>}
            <TrackPanel
              mediaType={mediaType}
              tmdbId={id}
              seasons={details.seasons}
              history={{
                viewings: viewings.map(({ id, season, episode, watchedOn }) => ({ id, season, episode, watchedOn })),
                season: entry?.season ?? null,
                episode: entry?.episode ?? null,
              }}
              notes={entry?.notes ?? null}
              initial={
                entry
                  ? { status: entry.status, rating: entry.rating, season: entry.season, episode: entry.episode }
                  : null
              }
            />
            <ListPicker
              mediaType={mediaType}
              tmdbId={id}
              lists={lists.map((l) => ({ id: l.id, name: l.name }))}
              initial={inLists}
            />
            <div className="flex flex-wrap gap-8">
              <Providers label="En streaming" items={details.providers.flatrate} />
              <Providers label="Location" items={details.providers.rent} />
              <Providers label="Achat" items={details.providers.buy} />
            </div>
          </div>
        </div>
      </section>

      {details.cast.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-title">Distribution</h2>
          <ScrollRow>
            {details.cast.map((c) => {
              const photo = imageUrl(c.profile_path, "w185");
              return (
                <Link key={c.id} href={`/personne/${c.id}`} className="group w-24 shrink-0 snap-start text-center sm:w-28">
                  <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-surface-2 ring-1 ring-white/10">
                    {photo ? (
                      <Image src={photo} alt={c.name} fill sizes="112px" className="object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center font-display text-2xl text-muted">
                        {c.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium transition group-hover:text-accent">{c.name}</p>
                  {c.character && <p className="line-clamp-1 text-xs text-muted">{c.character}</p>}
                </Link>
              );
            })}
          </ScrollRow>
        </section>
      )}

      <Shelf
        title="Dans le même esprit"
        items={similar
          .filter((t) => !owned.has(`${t.mediaType}:${t.id}`))
          .slice(0, 20)
          .map((t) => ({ ...t, actions: "add" as const }))}
        empty="Pas de suggestion pour ce titre."
      />
    </>
  );
}
