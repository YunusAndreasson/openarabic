'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { PublicHeader } from '@/components/public-header';
import { ArticleGrid } from '@/components/article-grid';
import { Footer } from '@/components/footer';
import { AppDownloadCTA } from '@/components/app-download-cta';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import type { PlatformInfo } from '@/lib/platform-detection';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];
type Author = Database['public']['Tables']['authors']['Row'];

interface ArticlesClientProps {
  initialArticles: Article[];
  initialCategories: Category[];
  initialAuthors: Author[];
  platformInfo: PlatformInfo;
}

/**
 * ArticlesClient - Handles client-side article filtering and infinite scroll
 * Receives server-rendered initial data and manages category filtering
 */
export function ArticlesClient({
  initialArticles,
  initialCategories,
  initialAuthors,
  platformInfo,
}: ArticlesClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialArticles.length === ITEMS_PER_PAGE);
  const [page, setPage] = useState(1);

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Dynamic page title based on selected category
  const selectedCategory = initialCategories.find(c => c.id === selectedCategoryId);
  const pageTitle = selectedCategory
    ? `${selectedCategory.name} Articles - OpenArabic`
    : 'OpenArabic - Learn Arabic Through Reading';
  usePageTitle(pageTitle);

  const fetchArticles = useCallback(async (pageNum: number, isInitial = false) => {
    try {
      // Set appropriate loading state
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

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

      if (isInitial) {
        setArticles(newArticles);
        setHasMore(newArticles.length === ITEMS_PER_PAGE);
      } else {
        // Deduplicate articles by ID to prevent duplicate keys
        setArticles(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));
          return [...prev, ...uniqueNewArticles];
        });
        setHasMore(newArticles.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      // TODO: Show error toast to user
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    // Only fetch when category changes (initial data already loaded from server)
    if (selectedCategoryId !== null) {
      setPage(1);
      setHasMore(true);
      fetchArticles(1, true);
    } else {
      // Reset to initial server-rendered articles
      setArticles(initialArticles);
      setPage(1);
      setHasMore(initialArticles.length === ITEMS_PER_PAGE);
    }
    // Only depend on selectedCategoryId to avoid unnecessary re-fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  }, [page, loadingMore, hasMore, fetchArticles]);

  // Infinite scroll observer - memoize to avoid recreation
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(currentTarget);

    return () => {
      observer.unobserve(currentTarget);
    };
    // Only recreate when handleLoadMore changes (which includes page, hasMore, etc.)
  }, [handleLoadMore, hasMore, loadingMore, loading]);

  const handleSelectCategory = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader
        categories={initialCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* App download CTA - Only show when not filtering by category */}
        {selectedCategoryId === null && platformInfo.isMobile && (
          <div className="mb-8">
            <AppDownloadCTA
              platformInfo={platformInfo}
              variant="hero"
              authors={initialAuthors}
            />
          </div>
        )}

        <ArticleGrid articles={articles} loading={loading} showCategoryPill={selectedCategoryId === null} />

        {/* Infinite scroll trigger point */}
        {!loading && hasMore && articles.length > 0 && (
          <div ref={observerTarget} className="flex justify-center mt-8 py-6">
            <div className="h-4 w-4 rounded-full border-2 border-primary/60 animate-pulse-sage" />
          </div>
        )}

        {/* End of content message */}
        {!loading && !hasMore && articles.length > 0 && (
          <div className="text-center mt-8 mb-6 text-muted-foreground/60 text-xs">
            You&apos;ve reached the end
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
