import { Header } from "@/components/header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted">
        Données fournies par TMDB. Ce produit utilise l&apos;API TMDB sans être approuvé ni certifié par TMDB.
      </footer>
    </>
  );
}
