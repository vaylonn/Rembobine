import Link from "next/link";
import { logout } from "@/app/connexion/actions";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/decouvrir", label: "Découvrir" },
  { href: "/bibliotheque", label: "Bibliothèque" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-accent">◀◀</span> Rembobine
        </Link>
        <nav className="flex gap-4 text-sm text-muted">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/recherche" className="order-last w-full sm:order-none sm:ml-auto sm:w-64">
          <input name="q" type="search" placeholder="Rechercher un film, une série…" className="input py-1.5 text-sm" />
        </form>
        <form action={logout} className="ml-auto sm:ml-0">
          <button type="submit" className="text-sm text-muted hover:text-fg">
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
