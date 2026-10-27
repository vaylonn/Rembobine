"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-white/10 bg-surface p-6">
      <h1 className="font-display text-2xl font-semibold">Quelque chose a coincé</h1>
      <p className="text-sm text-muted">
        La page n&apos;a pas pu se charger. Si c&apos;est le premier lancement, vérifie les variables
        d&apos;environnement <code>TMDB_API_TOKEN</code> et <code>DATABASE_URL</code> sur Vercel.
      </p>
      {error.digest && <p className="text-xs text-muted">Référence : {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-primary">
        Réessayer
      </button>
    </div>
  );
}
