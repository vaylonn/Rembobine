import { PageHeader } from "@/components/page-header";
import { EmptyState, PosterGrid } from "@/components/poster-card";
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
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="section-title">{title}</h2>
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
    <div className="space-y-12">
      <PageHeader title="À suivre" subtitle="Tes séries en cours : ce qu'il reste à rattraper et ce qui arrive bientôt." />

      {empty && (
        <EmptyState>
          Aucune série en cours. Marque une série « En cours » et indique ton dernier épisode vu pour la retrouver ici.
        </EmptyState>
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
