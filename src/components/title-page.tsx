import Image from "next/image";
import { notFound } from "next/navigation";
import { Shelf } from "@/components/poster-card";
import { TrackPanel } from "@/components/track-panel";
import { MEDIA_LABELS } from "@/lib/labels";
import { getEntry, listEntries } from "@/lib/library";
import type { MediaType } from "@/lib/schema";
import { getDetails, getRecommendationsFor, imageUrl, type Provider } from "@/lib/tmdb";

function Providers({ label, items }: { label: string; items: Provider[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <Image
            key={p.provider_id}
            src={imageUrl(p.logo_path, "w185")!}
            alt={p.provider_name}
            title={p.provider_name}
            width={36}
            height={36}
            className="rounded-md"
          />
        ))}
      </div>
    </div>
  );
}

export async function TitlePage({ mediaType, rawId }: { mediaType: MediaType; rawId: string }) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [details, entry, similar, library] = await Promise.all([
    getDetails(mediaType, id),
    getEntry(mediaType, id),
    getRecommendationsFor(mediaType, id).catch(() => []),
    listEntries(),
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
    details.voteAverage ? `★ ${details.voteAverage.toFixed(1)} TMDB` : null,
  ].filter(Boolean);

  return (
    <>
      <div className="relative -mx-4 -mt-8 overflow-hidden px-4 pt-8 pb-2">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            className="-z-10 object-cover opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />
        )}
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-56">
            {poster && <Image src={poster} alt={details.title} fill priority className="object-cover" />}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{details.title}</h1>
              {details.tagline && <p className="mt-1 italic text-muted">{details.tagline}</p>}
              <p className="mt-2 text-sm text-muted">{facts.join(" · ")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {details.genres.map((g) => (
                  <span key={g.id} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
            <TrackPanel
              mediaType={mediaType}
              tmdbId={id}
              seasons={details.seasons}
              initial={
                entry
                  ? { status: entry.status, rating: entry.rating, season: entry.season, episode: entry.episode }
                  : null
              }
            />
            {details.overview && <p className="max-w-3xl leading-relaxed">{details.overview}</p>}
            <div className="flex flex-wrap gap-6">
              <Providers label="En streaming" items={details.providers.flatrate} />
              <Providers label="Location" items={details.providers.rent} />
              <Providers label="Achat" items={details.providers.buy} />
            </div>
          </div>
        </div>
      </div>

      {details.cast.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Distribution</h2>
          <p className="text-sm text-muted">
            {details.cast.map((c) => (c.character ? `${c.name} (${c.character})` : c.name)).join(", ")}
          </p>
        </section>
      )}

      <Shelf
        title="Dans le même esprit"
        items={similar.filter((t) => !owned.has(`${t.mediaType}:${t.id}`)).slice(0, 20)}
        empty="Pas de suggestion pour ce titre."
      />
    </>
  );
}
