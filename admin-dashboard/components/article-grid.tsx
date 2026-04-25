'use client';

import { ArticleCard } from './article-card';
import type { Article } from '@/lib/types';

interface ArticleGridProps {
  articles: Article[];
  loading?: boolean;
  showCategoryPill?: boolean;
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-12 h-12 text-muted-foreground/20 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="text-base font-medium mb-2">No articles found</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Try selecting a different category or check back later for new content.
      </p>
    </div>
  );
}

/**
 * ArticleGrid - Pure presentation component
 * Renders articles in a responsive grid or shows empty state
 * Let Next.js Image handle loading - no manual tracking needed
 */
export function ArticleGrid({ articles, loading = false, showCategoryPill = true }: ArticleGridProps) {
  // Show empty state if no articles
  if (articles.length === 0 && !loading) {
    return <EmptyState />;
  }

  // Render articles with staggered fade-in animation (capped at 6 items)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {articles.map((article, index) => (
        <div
          key={article.id}
          className="animate-in fade-in duration-300 p-0.5"
          style={{
            // Cap delay at 6 items (240ms max) to avoid slow perceived performance
            animationDelay: `${Math.min(index, 6) * 40}ms`,
            animationFillMode: 'backwards',
          }}
        >
          <ArticleCard
            article={article}
            priority={index < 3}
            showCategoryPill={showCategoryPill}
          />
        </div>
      ))}
    </div>
  );
}
