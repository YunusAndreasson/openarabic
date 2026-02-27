'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Share2, Check } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { normalizeImageUrl, formatDate, estimateReadTime } from '@/lib/article-utils';
import { useTheme } from '@/components/providers/theme-provider';
import { shareArticle, canShare } from '@/utils/share';
import { ARTICLE_HEADER_BLUR } from '@/lib/blur-placeholder';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

interface ArticleHeaderProps {
  article: Article;
  showSummary?: boolean;
}

export function ArticleHeader({ article, showSummary = true }: ArticleHeaderProps) {
  const { isDark } = useTheme();
  const [shareSuccess, setShareSuccess] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleShare = async () => {
    const articleUrl = `${window.location.origin}/read/${article.id}`;
    const success = await shareArticle({
      title: article.title,
      text: article.summary,
      url: articleUrl,
    });

    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  return (
    <header className="relative min-h-[40vh] md:min-h-[50vh] w-full overflow-hidden flex items-end">
      {/* Optimized Hero Image */}
      <Image
        src={normalizeImageUrl(article.image_url)}
        alt={`Cover image for ${article.title}`}
        fill
        priority
        fetchPriority="high"
        className={`object-cover motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        sizes="100vw"
        quality={90}
        placeholder="blur"
        blurDataURL={ARTICLE_HEADER_BLUR}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Theme-aware Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-black/90 via-black/60 to-black/20' : 'from-black/80 via-black/40 to-black/10'}`} />
      {/* Extended gradient for longer summaries */}
      <div className={`absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t ${isDark ? 'from-black/90 to-transparent' : 'from-black/80 to-transparent'} pointer-events-none`} />

      {/* Content - All aligned with same margins */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        {/* Category Badge - Clickable to navigate to category */}
        <div className="mb-6 md:mb-8">
          <Link
            href="/"
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm md:text-base font-semibold bg-white/25 text-white backdrop-blur-md ring-1 ring-white/30 shadow-lg shadow-black/25 capitalize hover:bg-white/30 transition-colors duration-150 text-shadow-overlay"
            aria-label={`View all ${article.categories?.name || 'Uncategorized'} articles`}
          >
            {article.categories?.name || 'Uncategorized'}
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-[1.1] tracking-tight max-w-5xl">
          {article.title}
        </h1>

        {/* Summary - Subtitle style */}
        {showSummary && article.summary && (
          <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-serif leading-relaxed mb-6 md:mb-8 max-w-4xl">
            {article.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-sm md:text-base">
          <span className="font-medium">{article.authors?.name || 'OpenArabic'}</span>
          <time
            dateTime={article.created_at}
            className="opacity-90"
          >
            {formatDate(article.created_at)}
          </time>
          <span className="opacity-90">{estimateReadTime(article.summary, article.difficulty_level)}</span>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-md ring-1 ring-white/20 transition-colors duration-150"
            aria-label={shareSuccess ? 'Link copied' : 'Share article'}
            title={canShare() ? 'Share' : 'Copy link'}
          >
            {shareSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-xs font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span className="text-xs font-medium">Share</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
