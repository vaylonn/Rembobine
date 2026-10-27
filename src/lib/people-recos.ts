import "server-only";
import { listDismissed } from "./dismissals";
import { listEntries } from "./library";
import { affinity, key, pickSeeds } from "./scoring";
import { getDetails, getPerson, type PersonCredit } from "./tmdb";

const SEED_COUNT = 15;
const CAST_PER_TITLE = 5;
const MAX_PEOPLE = 3;

export type PeopleShelf = {
  person: { id: number; name: string };
  /** Titres de ta bibliothèque où on retrouve cette personne. */
  because: string[];
  items: PersonCredit[];
};

/**
 * Les réalisateurs et acteurs qui reviennent dans les titres que tu as le
 * mieux notés, et ce qu'ils ont fait d'autre que tu n'as pas encore vu.
 */
export async function getPeopleRecommendations(): Promise<PeopleShelf[]> {
  const [library, dismissed] = await Promise.all([listEntries(), listDismissed()]);
  const seeds = pickSeeds(library, SEED_COUNT);
  if (seeds.length < 2) return [];

  const details = await Promise.all(seeds.map((e) => getDetails(e.mediaType, e.tmdbId)));
  const people = new Map<number, { name: string; score: number; titles: string[]; director: boolean }>();
  const add = (id: number, name: string, weight: number, title: string, director: boolean) => {
    const p = people.get(id) ?? { name, score: 0, titles: [], director };
    if (p.titles.includes(title)) return;
    p.score += weight;
    p.titles.push(title);
    p.director ||= director;
    people.set(id, p);
  };
  seeds.forEach((entry, i) => {
    const d = details[i];
    if (!d) return;
    const weight = affinity(entry);
    // Un réalisateur en dit plus sur tes goûts qu'un acteur.
    for (const p of d.directors) add(p.id, p.name, weight * 1.5, entry.title, true);
    for (const p of d.cast.slice(0, CAST_PER_TITLE)) add(p.id, p.name, weight, entry.title, false);
  });

  const top = [...people]
    .filter(([, p]) => p.titles.length >= 2)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_PEOPLE);

  const hidden = new Set([
    ...library.map((e) => key({ mediaType: e.mediaType, id: e.tmdbId })),
    ...dismissed.map((d) => key({ mediaType: d.mediaType, id: d.tmdbId })),
  ]);
  const shelves = await Promise.all(
    top.map(async ([id, p]) => {
      const person = await getPerson(id);
      if (!person) return null;
      const pool = p.director ? [...person.directing, ...person.acting] : person.acting;
      const items = pool.filter((t) => t.posterPath && !hidden.has(key(t)));
      const unique = [...new Map(items.map((t) => [key(t), t])).values()].slice(0, 20);
      return unique.length ? { person: { id, name: p.name }, because: p.titles, items: unique } : null;
    }),
  );
  return shelves.filter((s): s is PeopleShelf => s !== null);
}
