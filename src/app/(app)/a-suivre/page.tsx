import { PosterGrid } from "@/components/poster-card";
import { getUpNext, type UpNextItem } from "@/lib/up-next";

export const metadata = { title: "À suivre · Rembobine" };

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

function airDate(value: string) {
  const date = new Date(value);
  const today = new Date().toISOString().slice(0, 10);
  if (value === today) return "aujourd'hui";
  return DATE.format(date);
}

function code(e: { season: number; episode: number }) {
  return `S${e.season}·É${e.episode}`;
}

function card(item: UpNextItem, note: string) {
  const e = item.entry;
  return {
    id: e.tmdbId,
    mediaType: e.mediaType,
    title: e.title,
    posterPath: e.posterPath,
    year: e.year,
    note,
  };
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function UpNextPage() {
  const { behind, upcoming, upToDate } = await getUpNext();
  const empty = !behind.length && !upcoming.length && !upToDate.length;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">À suivre</h1>

      {empty && (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Aucune série en cours. Marque une série « En cours » et indique ton dernier épisode vu pour la retrouver ici.
        </p>
      )}

      {behind.length > 0 && (
        <Section title="À rattraper" hint="Épisodes déjà sortis que tu n'as pas encore vus.">
          <PosterGrid
            items={behind.map((item) =>
              card(
                item,
                item.resumed
                  ? `Nouveaux épisodes · saison ${item.nextToWatch?.season ?? "?"}`
                  : `${item.behind} à voir · ${item.nextToWatch ? code(item.nextToWatch) : ""}`,
              ),
            )}
          />
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="Prochaines sorties" hint="Tu es à jour : voilà quand sort la suite.">
          <PosterGrid
            items={upcoming.map((item) =>
              card(
                item,
                item.upcoming?.airDate
                  ? `${code(item.upcoming)} · ${airDate(item.upcoming.airDate)}`
                  : `${code(item.upcoming!)} · date inconnue`,
              ),
            )}
          />
        </Section>
      )}

      {upToDate.length > 0 && (
        <Section title="À jour" hint="Rien d'annoncé pour l'instant.">
          <PosterGrid items={upToDate.map((item) => card(item, "À jour"))} />
        </Section>
      )}
    </div>
  );
}
