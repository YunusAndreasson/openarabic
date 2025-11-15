'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { generateSlug } from '@/lib/slugify';
import { useTheme } from '@/components/providers/theme-provider';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleCardProps {
  article: Article;
  priority?: boolean;
  showCategoryPill?: boolean;
}

function normalizeImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/images/${imageUrl}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Relative dates for recent articles (within 30 days)
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }

  // Absolute dates for older articles
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

function estimateReadTime(summary: string, difficultyLevel: number): string {
  // Count words in summary as a proxy for article length
  const wordCount = summary.trim().split(/\s+/).length;

  // Estimate total article length (summary is typically ~10-15% of article)
  const estimatedTotalWords = wordCount * 8;

  // Average reading speed: 200-250 words/min, use 225
  // Adjust for difficulty (harder = slower reading)
  const readingSpeed = difficultyLevel <= 2 ? 250 : difficultyLevel <= 4 ? 225 : 200;
  const minutes = Math.ceil(estimatedTotalWords / readingSpeed);

  // Bilingual multiplier: reading both Arabic and English takes ~2x longer
  // Users switch between languages, compare translations, process dual content
  const bilingualReadTime = Math.ceil(minutes * 2);

  // Minimum 1 min
  const readTime = Math.max(1, bilingualReadTime);

  return `${readTime} min read`;
}

export function ArticleCard({ article, priority = false, showCategoryPill = true }: ArticleCardProps) {
  const { isDark } = useTheme();

  return (
    <Link
      href={`/read/${generateSlug(article.title, article.id)}`}
      prefetch={true}
      className="group block h-full will-change-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
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
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            fetchPriority={priority ? 'high' : undefined}
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
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/25 text-white capitalize backdrop-blur-md ring-1 ring-white/30 shadow-lg shadow-black/25"
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)',
                }}
              >
                {article.categories?.name || 'General'}
              </span>
            </div>
          )}

          {/* Title Overlay - Only in dark mode */}
          {isDark && (
            <div className="absolute bottom-0 left-0 right-0 pl-4 pr-4 pb-0 pt-6 md:pr-5 md:pb-0 md:pt-8">
              <h2 className="text-lg md:text-xl font-bold leading-[1.3] text-white line-clamp-2">
                {article.title}
              </h2>
            </div>
          )}
        </div>

        {/* Content - Title (light mode only), Summary and Metadata */}
        <div className="flex flex-col flex-1 px-6 pb-4 md:px-[26px] md:pb-4 pt-4 md:pt-5">
          {/* Title - Light mode only (below image) */}
          {!isDark && (
            <h2 className="text-lg md:text-xl font-bold leading-[1.3] text-foreground line-clamp-2 mb-3 -mx-2 md:-mx-[10px]">
              {article.title}
            </h2>
          )}

          {/* Summary */}
          <p className="text-foreground/90 text-base line-clamp-4 leading-[1.618] font-serif -mx-2 md:-mx-[10px]">
            {article.summary}
          </p>

          {/* Metadata - Author, Date, Read Time */}
          <div className={`flex items-center gap-2 text-xs text-muted-foreground/80 flex-wrap mt-auto -mx-2 md:-mx-[10px] ${isDark ? 'pt-5' : 'pt-4'}`}>
            <span className="font-medium text-foreground/90">{article.authors?.name || 'OpenArabic'}</span>
            <span className="opacity-30">·</span>
            <span className="opacity-65">{formatDate(article.created_at)}</span>
            <span className="opacity-30">·</span>
            <span className="opacity-65">{estimateReadTime(article.summary, article.difficulty_level)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
