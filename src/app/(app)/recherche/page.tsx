import { PosterGrid } from "@/components/poster-card";
import { searchTitles } from "@/lib/tmdb";

export const metadata = { title: "Recherche · Rembobine" };

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const results = query ? await searchTitles(query) : [];

  return (
    <section className="space-y-6">
      <form className="flex gap-2">
        <input name="q" type="search" defaultValue={query} placeholder="Titre d'un film ou d'une série" autoFocus className="input" />
        <button type="submit" className="btn-primary">Chercher</button>
      </form>
      {query && (
        <p className="text-sm text-muted">
          {results.length
            ? `${results.length} résultat${results.length > 1 ? "s" : ""} pour « ${query} »`
            : `Aucun résultat pour « ${query} ».`}
        </p>
      )}
      <PosterGrid items={results} />
    </section>
  );
}
