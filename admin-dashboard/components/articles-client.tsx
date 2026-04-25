'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PublicHeader } from '@/components/public-header';
import { ArticleGrid } from '@/components/article-grid';
import { Footer } from '@/components/footer';
import { AppDownloadCTA } from '@/components/app-download-cta';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import { BookDownloads } from '@/components/book-downloads';
import type { PlatformInfo } from '@/lib/platform-detection';
import type { Article, Category, Author } from '@/lib/types';

interface ArticlesClientProps {
  initialArticles: Article[];
  initialCategories: Category[];
  initialAuthors: Author[];
  platformInfo: PlatformInfo;
  selectedCategoryId: number | null;
}

/**
 * ArticlesClient - Handles article display and infinite scroll
 * Category filtering is driven by URL searchParams via the server component
 * Only infinite scroll (loading more pages) happens client-side
 */
export function ArticlesClient({
  initialArticles,
  initialCategories,
  initialAuthors,
  platformInfo,
  selectedCategoryId,
}: ArticlesClientProps) {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length === ITEMS_PER_PAGE);
  const [page, setPage] = useState(1);

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset articles when server provides new initial data (category change)
  useEffect(() => {
    setArticles(initialArticles);
    setPage(1);
    setHasMore(initialArticles.length === ITEMS_PER_PAGE);
  }, [initialArticles]);

  const fetchMoreArticles = useCallback(async (pageNum: number) => {
    try {
      setLoadingMore(true);

      const from = (pageNum - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('articles')
        .select('*, authors(name), categories(name)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (selectedCategoryId !== null) {
        query = query.eq('category_id', selectedCategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const newArticles = (data as Article[]) || [];

      // Deduplicate articles by ID to prevent duplicate keys
      setArticles(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));
        return [...prev, ...uniqueNewArticles];
      });
      setHasMore(newArticles.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedCategoryId]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMoreArticles(nextPage);
  }, [page, loadingMore, hasMore, fetchMoreArticles]);

  // Infinite scroll observer
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(currentTarget);

    return () => {
      observer.unobserve(currentTarget);
    };
  }, [handleLoadMore, hasMore, loadingMore]);

  // Navigate via URL params so the server component handles the filtered query
  const handleSelectCategory = (categoryId: number | null) => {
    if (categoryId === null) {
      router.push('/');
    } else {
      router.push(`/?category=${categoryId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader
        categories={initialCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* App download CTA - Mobile: single store, Desktop: both stores */}
        {selectedCategoryId === null && (
          <>
            <div className="mb-8">
              <AppDownloadCTA
                platformInfo={platformInfo}
                variant="hero"
                authors={initialAuthors}
                showBothStores={!platformInfo.isMobile}
              />
            </div>

            {/* About + Free Books */}
            <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border/60 bg-card p-6">
                <h3 className="text-base font-semibold text-foreground mb-2">Who is this for?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Learners who can decode Arabic and want to read real texts — especially those studying with a course or who just finished one and need vocabulary to read independently.
                </p>
                <h3 className="text-base font-semibold text-foreground mb-2">How does it work?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You read bilingual sentence pairs at 90–95% comprehension, with 5–10% new vocabulary per article. Tap unknown words to add them to spaced repetition. Regular reading builds pattern recognition without explicit grammar study.
                </p>
              </div>
              <BookDownloads />
            </div>
          </>
        )}

        <ArticleGrid articles={articles} loading={false} showCategoryPill={selectedCategoryId === null} />

        {/* Infinite scroll trigger point */}
        {hasMore && articles.length > 0 && (
          <div ref={observerTarget} className="flex justify-center mt-8 py-6">
            <div className="h-4 w-4 rounded-full border-2 border-primary/60 animate-pulse-sage" />
          </div>
        )}

        {/* End of content message */}
        {!hasMore && articles.length > 0 && (
          <div className="text-center mt-8 mb-6 text-muted-foreground/60 text-xs">
            You&apos;ve reached the end
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
