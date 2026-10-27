export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-full bg-surface" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
