export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
