"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { logout } from "@/app/connexion/actions";
import { CompassIcon, HomeIcon, LibraryIcon, LogoutIcon, SearchIcon } from "./icons";

const LINKS = [
  { href: "/", label: "Accueil", icon: HomeIcon },
  { href: "/decouvrir", label: "Découvrir", icon: CompassIcon },
  { href: "/bibliotheque", label: "Bibliothèque", icon: LibraryIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm text-accent-fg">◀◀</span>
      <span>Rembobine</span>
    </Link>
  );
}

function SearchField() {
  const query = useSearchParams().get("q") ?? "";
  return (
    <form action="/recherche" className="relative hidden w-56 md:block lg:w-72">
      <SearchIcon className="pointer-events-none absolute left-3.5 z-10 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
      <input
        key={query}
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Films, séries…"
        aria-label="Rechercher"
        className="input bg-white/5 py-1.5 pl-10 text-sm backdrop-blur"
      />
    </form>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          scrolled ? "border-b border-white/5 bg-bg/85 backdrop-blur-xl" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className="container-page flex h-16 items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive(pathname, l.href) ? "bg-white/10 text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Suspense>
              <SearchField />
            </Suspense>
            <Link
              href="/recherche"
              aria-label="Rechercher"
              className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg md:hidden"
            >
              <SearchIcon />
            </Link>
            <form action={logout}>
              <button
                type="submit"
                title="Déconnexion"
                aria-label="Déconnexion"
                className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
              >
                <LogoutIcon width={18} height={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Barre d'onglets en bas de l'écran sur mobile. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-4">
          {[...LINKS.slice(0, 2), { href: "/recherche", label: "Recherche", icon: SearchIcon }, LINKS[2]].map((l) => {
            const active = isActive(pathname, l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon width={22} height={22} />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
