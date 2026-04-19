export function CategoryDashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col items-center justify-center px-1 pt-8 text-center">
        <div className="mx-auto h-28 max-w-2xl w-full animate-pulse rounded-2xl bg-muted/45 sm:h-32" />
        <div className="mt-8 grid w-full max-w-[56rem] grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-5 md:gap-2 lg:gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[3rem] animate-pulse rounded-2xl bg-muted/50 sm:h-[3.25rem] md:h-[3.5rem]"
            />
          ))}
        </div>
      </div>
      <div className="mt-5 sm:mt-8">
        <div className="glass-strong h-72 animate-pulse rounded-[1.75rem] shadow-glass sm:h-80" />
      </div>
    </div>
  );
}
