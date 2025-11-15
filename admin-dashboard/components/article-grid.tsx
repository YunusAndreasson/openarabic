'use client';

import { ArticleCard } from './article-card';
import type { Database } from '@/lib/database.types';
import { Loader2 } from 'lucide-react';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

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
          strokeWidth={1}
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

function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-muted animate-pulse" />
      <div className="p-6 space-y-3">
        <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-full" />
        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-3 bg-muted rounded animate-pulse w-full" />
      </div>
    </div>
  );
}

export function ArticleGrid({ articles, loading = false, showCategoryPill = true }: ArticleGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {articles.map((article, index) => (
        <div
          key={article.id}
          className="animate-in fade-in duration-300"
          style={{
            animationFillMode: 'backwards',
          }}
        >
          <ArticleCard article={article} priority={index < 3} showCategoryPill={showCategoryPill} />
        </div>
      ))}
    </div>
  );
}
