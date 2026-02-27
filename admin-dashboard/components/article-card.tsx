'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { generateSlug } from '@/lib/slugify';
import { normalizeImageUrl, formatDate, estimateReadTime } from '@/lib/article-utils';
import { useTheme } from '@/components/providers/theme-provider';
import { ARTICLE_CARD_BLUR } from '@/lib/blur-placeholder';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleCardProps {
  article: Article;
  priority?: boolean;
  showCategoryPill?: boolean;
}

export function ArticleCard({ article, priority = false, showCategoryPill = true }: ArticleCardProps) {
  const { isDark } = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link
      href={`/read/${generateSlug(article.title, article.id)}`}
      prefetch={true}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      aria-label={`Read article: ${article.title}`}
    >
      <article
        className="article-card h-full flex flex-col bg-card rounded-lg transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        {/* Image - Golden Ratio (φ:1) with conditional title overlay */}
        <div
          className="relative w-full aspect-[1.618/1] bg-muted overflow-hidden rounded-t-lg"
        >
          <Image
            src={normalizeImageUrl(article.image_url)}
            alt={article.title}
            fill
            className={`object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            fetchPriority={priority ? 'high' : undefined}
            placeholder="blur"
            blurDataURL={ARTICLE_CARD_BLUR}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Gradient overlay - only in dark mode */}
          {isDark && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent via-card/40 to-card" />
            </>
          )}

          {/* Category Badge - Conditionally shown */}
          {showCategoryPill && (
            <div className="absolute top-4 left-4">
              <span
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/25 text-white capitalize backdrop-blur-md ring-1 ring-white/30 shadow-lg shadow-black/25 text-shadow-overlay"
              >
                {article.categories?.name || 'General'}
              </span>
            </div>
          )}

          {/* Title Overlay - Only in dark mode */}
          {isDark && (
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-8">
              <h2 className="text-lg md:text-xl font-bold leading-[1.3] text-white line-clamp-2">
                {article.title}
              </h2>
            </div>
          )}
        </div>

        {/* Content - Title (light mode only), Summary and Metadata */}
        <div className="flex flex-col flex-1 px-4 pt-4 pb-4">
          {/* Title - Light mode only (below image) */}
          {!isDark && (
            <h2 className="text-lg md:text-xl font-bold leading-[1.3] text-foreground line-clamp-2 mb-1.5">
              {article.title}
            </h2>
          )}

          {/* Summary */}
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {article.summary}
          </p>

          {/* Metadata - Author, Date, Read Time */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto pt-4">
            <span className="font-medium">{article.authors?.name || 'OpenArabic'}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{formatDate(article.created_at)}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{estimateReadTime(article.summary, article.difficulty_level)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
