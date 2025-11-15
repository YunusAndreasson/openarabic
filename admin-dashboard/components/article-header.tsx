'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { useTheme } from '@/components/providers/theme-provider';

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

export function ArticleHeader({ article }: ArticleHeaderProps) {
  const { isDark } = useTheme();

  return (
    <header className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
      {/* Optimized Hero Image */}
      <Image
        src={normalizeImageUrl(article.image_url)}
        alt={`Cover image for ${article.title}`}
        fill
        priority
        fetchPriority="high"
        className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:hover:scale-105"
        sizes="100vw"
        quality={90}
      />

      {/* Theme-aware Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-black/90 via-black/60 to-black/20' : 'from-black/80 via-black/40 to-black/10'}`} />

      {/* Content - All aligned with same margins */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-20 lg:pb-24">
          {/* Category Badge - Clickable to navigate to category */}
          <div className="mb-6 md:mb-8">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm md:text-base font-semibold bg-white/25 text-white backdrop-blur-md ring-1 ring-white/30 shadow-lg shadow-black/25 capitalize cursor-pointer hover:bg-white/30 transition-colors duration-150"
              style={{
                textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)',
              }}
              aria-label={`View all ${article.categories?.name || 'Uncategorized'} articles`}
            >
              {article.categories?.name || 'Uncategorized'}
            </Link>
          </div>

          {/* Title - Reduced size for better balance */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 leading-[1.1] tracking-tight max-w-5xl">
            {article.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-sm md:text-base">
            <span className="font-medium">{article.authors?.name || 'OpenArabic'}</span>
            <span className="opacity-50">•</span>
            <time
              dateTime={article.created_at}
              className="opacity-90"
            >
              {formatDate(article.created_at)}
            </time>
            <span className="opacity-50">•</span>
            <span className="opacity-90">{estimateReadTime(article.summary, article.difficulty_level)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
