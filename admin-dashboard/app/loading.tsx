import { SKELETON_CARD_COUNT } from '@/lib/constants';
import { SkeletonCard } from '@/components/skeleton-card';

/**
 * Loading state for homepage
 * Shown during navigation or while server component is loading
 * Uses viewTransitionName for smooth page transitions
 */
export default function HomeLoading() {
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

      {/* Content Skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
