import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-xl font-semibold">Titre introuvable</h1>
      <Link href="/" className="btn-ghost">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
