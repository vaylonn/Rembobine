import { SearchIcon } from "@/components/icons";
import { PosterGrid } from "@/components/poster-card";
import { searchTitles } from "@/lib/tmdb";

export const metadata = { title: "Recherche · Rembobine" };

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const results = query ? await searchTitles(query) : [];

  return (
    <section className="space-y-6">
      <form className="relative">
        <SearchIcon className="pointer-events-none absolute left-5 z-10 top-1/2 -translate-y-1/2 text-muted" width={22} height={22} />
        <input
          key={query}
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Titre d'un film ou d'une série"
          autoFocus
          className="input py-4 pl-14 pr-32 text-lg"
        />
        <button type="submit" className="btn-primary absolute right-2 top-1/2 -translate-y-1/2">
          Chercher
        </button>
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
