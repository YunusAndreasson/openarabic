export default function ReadingLoading() {
  return (
    <div className="min-h-screen flex flex-col" style={{ viewTransitionName: 'content' }}>
      {/* Header Skeleton */}
      <div className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-9 w-20 bg-muted rounded-lg animate-pulse" />
              <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Skeleton */}
      <div className="relative h-[40vh] md:h-[50vh] w-full bg-muted animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10">
          <div className="absolute inset-0 flex items-end">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-20">
              {/* Category badge */}
              <div className="mb-6 md:mb-8">
                <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse" />
              </div>
              {/* Title */}
              <div className="h-12 w-3/4 bg-white/20 rounded animate-pulse mb-4 md:mb-6" />
              {/* Summary */}
              <div className="h-6 w-2/3 bg-white/20 rounded animate-pulse mb-6 md:mb-8" />
              {/* Metadata */}
              <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton - Sentence pairs only */}
      <article className="py-12 md:py-16">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-full bg-muted rounded animate-pulse" />
                <div className="h-6 w-full bg-muted rounded animate-pulse" />
                <div className="h-5 w-3/4 bg-muted/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
