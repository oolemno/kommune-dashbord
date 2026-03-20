export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-stone-200 ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <Skeleton className="mb-4 h-6 w-40" />
      <Skeleton className="mb-3 h-10 w-32" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-3/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
