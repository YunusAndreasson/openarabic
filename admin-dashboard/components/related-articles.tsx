'use client';

import type { Database } from '@/lib/database.types';
import { ArticleGrid } from '@/components/article-grid';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface RelatedArticlesProps {
  articles: Article[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section className="border-t border-border/40 bg-muted/20 py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-foreground">
          You Might Also Like
        </h2>
        <ArticleGrid articles={articles} />
      </div>
    </section>
  );
}
