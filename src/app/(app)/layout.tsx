import { Header } from "@/components/header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="container-page flex-1 space-y-12 pb-12 pt-[calc(6rem+env(safe-area-inset-top))]">{children}</main>
      <footer className="container-page border-t border-white/5 pb-24 pt-6 text-xs text-muted sm:pb-8">
        Données fournies par TMDB. Ce produit utilise l&apos;API TMDB sans être approuvé ni certifié par TMDB.
      </footer>
    </>
  );
}
