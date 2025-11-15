'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { PublicHeader } from '@/components/public-header';
import { ArticleGrid } from '@/components/article-grid';
import { Footer } from '@/components/footer';
import { Loader2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

const ITEMS_PER_PAGE = 12;

export default function PublicArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Dynamic page title based on selected category
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const pageTitle = selectedCategory
    ? `${selectedCategory.name} Articles - OpenArabic`
    : 'OpenArabic - Learn Arabic Through Reading';
  usePageTitle(pageTitle);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchArticles = useCallback(async (pageNum: number, isInitial = false) => {
    try {
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
      } else {
        // Deduplicate articles by ID to prevent duplicate keys
        setArticles(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));
          return [...prev, ...uniqueNewArticles];
        });
      }

      // Check if there are more articles
      setHasMore(newArticles.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Reset and fetch when category changes
    setPage(1);
    setArticles([]);
    setHasMore(true);
    fetchArticles(1, true);
  }, [selectedCategoryId, fetchArticles]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  }, [page, loadingMore, hasMore, fetchArticles]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, handleLoadMore]);

  const handleSelectCategory = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <ArticleGrid articles={articles} loading={loading} showCategoryPill={selectedCategoryId === null} />

        {/* Infinite scroll trigger point */}
        {!loading && hasMore && articles.length > 0 && (
          <div ref={observerTarget} className="flex justify-center mt-12 py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
          </div>
        )}

        {/* End of content message */}
        {!loading && !hasMore && articles.length > 0 && (
          <div className="text-center mt-12 mb-8 text-muted-foreground/60 text-xs">
            You&apos;ve reached the end
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
