import type { Bar } from "@/lib/stats";

/** Chiffre clé en tête de page : pas besoin d'un graphique pour un seul nombre. */
export function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-1.5 text-xs text-fg shadow-xl group-hover:block group-focus:block">
      {children}
    </span>
  );
}

/** Barres verticales (une seule série, donc pas de légende : le titre la nomme). */
export function ColumnChart({ title, bars, unit }: { title: string; bars: Bar[]; unit: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const peak = bars.findIndex((b) => b.value === max);
  return (
    <figure className="space-y-3 rounded-2xl border border-white/5 bg-surface p-4">
      <figcaption className="text-sm font-semibold">{title}</figcaption>
      <div className="flex h-40 items-end gap-1.5 border-b border-white/10" role="list">
        {bars.map((b, i) => (
          <div
            key={`${b.label}-${i}`}
            role="listitem"
            tabIndex={0}
            aria-label={b.hint ?? `${b.label} : ${b.value} ${unit}`}
            className="group relative flex h-full flex-1 flex-col justify-end outline-none"
          >
            {i === peak && b.value > 0 && (
              <span className="mb-1 whitespace-nowrap text-center text-[11px] font-medium text-fg/80">
                {b.value} {unit}
              </span>
            )}
            <div
              className="rounded-t-[4px] bg-accent/85 transition group-hover:bg-accent group-focus:bg-accent"
              style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value ? 2 : 0 }}
            />
            <Tooltip>{b.hint ?? `${b.label} : ${b.value} ${unit}`}</Tooltip>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 text-center text-[10px] text-muted">
        {bars.map((b, i) => (
          <span key={`${b.label}-${i}`} className="flex-1 truncate">
            {/* Sur mobile, l'initiale suffit (« j », « f »…). */}
            <span className="sm:hidden">{b.label.length > 2 ? b.label.charAt(0) : b.label}</span>
            <span className="hidden sm:inline">{b.label}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Barres horizontales étiquetées, pour un classement. */
export function RankChart({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <figure className="space-y-3 rounded-2xl border border-white/5 bg-surface p-4">
      <figcaption className="text-sm font-semibold">{title}</figcaption>
      <ul className="space-y-2">
        {bars.map((b) => (
          <li key={b.label} tabIndex={0} className="group relative grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm outline-none">
            <span className="truncate text-fg/85">{b.label}</span>
            <span className="h-2.5 overflow-hidden rounded-r-[4px] bg-white/5">
              <span
                className="block h-full rounded-r-[4px] bg-accent/85 transition group-hover:bg-accent"
                style={{ width: `${(b.value / max) * 100}%` }}
              />
            </span>
            <span className="text-right text-xs text-muted">{b.value}</span>
            {b.hint && <Tooltip>{b.hint}</Tooltip>}
          </li>
        ))}
      </ul>
    </figure>
  );
}
