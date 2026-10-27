import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <p className="font-display text-7xl font-black text-transparent [-webkit-text-stroke:2px_var(--color-border)]">404</p>
      <h1 className="font-display text-2xl font-semibold">Titre introuvable</h1>
      <Link href="/" className="btn-ghost">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
