/**
 * SkeletonCard - Loading skeleton for article cards
 * Matches the aspect ratio and layout of ArticleCard
 * Used in both ArticleGrid and loading.tsx
 */
export function SkeletonCard() {
  return (
    <div className="h-full flex flex-col bg-card rounded-lg">
      {/* Image skeleton - matches ArticleCard image */}
      <div className="relative w-full aspect-[1.618/1] bg-muted animate-pulse rounded-t-lg">
        {/* Category badge skeleton */}
        <div className="absolute top-4 left-4">
          <div className="h-7 w-20 bg-background/30 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Content skeleton - matches ArticleCard content padding */}
      <div className="flex flex-col flex-1 px-4 pt-4 pb-4">
        {/* Title skeleton (2 lines) */}
        <div className="space-y-2 mb-1.5">
          <div className="h-5 md:h-6 bg-muted rounded animate-pulse w-full" />
          <div className="h-5 md:h-6 bg-muted rounded animate-pulse w-3/4" />
        </div>

        {/* Summary skeleton (3 lines) */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
        </div>

        {/* Metadata skeleton - at bottom */}
        <div className="flex items-center gap-1.5 mt-auto pt-4">
          <div className="h-3 bg-muted rounded animate-pulse w-20" />
          <div className="h-3 bg-muted rounded animate-pulse w-1" />
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
          <div className="h-3 bg-muted rounded animate-pulse w-1" />
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
}
