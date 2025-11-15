'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';

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

function estimateReadTime(difficultyLevel: number): string {
  // Estimate read time based on difficulty level
  // Higher difficulty typically correlates with longer, more complex articles
  if (difficultyLevel <= 2) return '3 min read';
  if (difficultyLevel <= 4) return '5 min read';
  return '7 min read';
}

export function ArticleCard({ article, priority = false, showCategoryPill = true }: ArticleCardProps) {
  return (
    <Link href={`/read/${article.id}`} className="group block h-full">
      <article className="h-full flex flex-col bg-card rounded-lg overflow-hidden border-2 border-transparent shadow-[0_2px_0_rgba(0,0,0,0.08)] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-[0_0_0_3px_hsl(156_17%_43%/0.35),0_0_0_6px_hsl(156_17%_43%/0.12)]">
        {/* Image - Golden Ratio (φ:1) with Title Overlay */}
        <div className="relative w-full aspect-[1.618/1] bg-muted overflow-hidden">
          <Image
            src={normalizeImageUrl(article.image_url)}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
          {/* Gradient overlay - stronger at bottom for title readability, fades to card bg */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-b from-transparent via-card/40 to-card" />

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

          {/* Title Overlay - Bottom (aligned with pill at 16px, extends into content) */}
          <div className="absolute bottom-0 left-0 right-0 pl-4 pr-4 pb-1 pt-6 md:pr-5 md:pb-1.5 md:pt-8">
            <h2
              className="text-lg md:text-xl font-bold leading-[1.3] text-white line-clamp-2"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 1px 12px rgba(0,0,0,0.4)',
              }}
            >
              {article.title}
            </h2>
          </div>
        </div>

        {/* Content - Summary and Metadata only */}
        <div className="flex flex-col flex-1 px-6 pt-3 pb-4 md:px-[26px] md:pt-4 md:pb-4">
          {/* Summary - Golden ratio line-height */}
          <p className="text-muted-foreground text-sm line-clamp-4 leading-[1.618] -mx-2 md:-mx-[10px]">
            {article.summary}
          </p>

          {/* Metadata - Author, Date, Read Time */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 flex-wrap mt-auto pt-4 -mx-2 md:-mx-[10px]">
            <span className="font-medium">{article.authors?.name || 'OpenArabic'}</span>
            <span className="opacity-50">·</span>
            <span className="opacity-90">{formatDate(article.created_at)}</span>
            <span className="opacity-50">·</span>
            <span className="opacity-90">{estimateReadTime(article.difficulty_level)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
