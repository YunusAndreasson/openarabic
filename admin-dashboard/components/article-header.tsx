'use client';

import Image from 'next/image';
import type { Database } from '@/lib/database.types';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleHeaderProps {
  article: Article;
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
  if (difficultyLevel <= 2) return '3 min read';
  if (difficultyLevel <= 4) return '5 min read';
  return '7 min read';
}

export function ArticleHeader({ article }: ArticleHeaderProps) {
  return (
    <header className="relative h-[50vh] md:h-[70vh] w-full overflow-hidden">
      {/* Optimized Hero Image */}
      <Image
        src={normalizeImageUrl(article.image_url)}
        alt={`Cover image for ${article.title}`}
        fill
        priority
        className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:hover:scale-105"
        sizes="100vw"
        quality={90}
      />

      {/* Modern Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-20 lg:pb-24">
          {/* Category Badge */}
          <div className="mb-6 md:mb-8">
            <span
              className="inline-flex items-center px-4 py-2 rounded-full text-sm md:text-base font-medium bg-primary/20 text-white backdrop-blur-sm border border-white/20 capitalize"
              aria-label={`Category: ${article.categories?.name || 'Uncategorized'}`}
            >
              {article.categories?.name || 'Uncategorized'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-8 leading-[1.1] tracking-tight max-w-6xl">
            {article.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-base md:text-lg">
            <span className="font-medium">{article.authors?.name || 'OpenArabic'}</span>
            <span className="opacity-50">•</span>
            <time
              dateTime={article.created_at}
              className="opacity-90"
            >
              {formatDate(article.created_at)}
            </time>
            <span className="opacity-50">•</span>
            <span className="opacity-90">{estimateReadTime(article.difficulty_level)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
