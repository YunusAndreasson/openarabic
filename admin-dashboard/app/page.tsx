'use client';

import { useEffect, useState } from 'react';
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

  // Dynamic page title based on selected category
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const pageTitle = selectedCategory
    ? `${selectedCategory.name} Articles - OpenArabic`
    : 'OpenArabic - Learn Arabic Through Reading';
  usePageTitle(pageTitle);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Reset and fetch when category changes
    setPage(1);
    setArticles([]);
    setHasMore(true);
    fetchArticles(1, true);
  }, [selectedCategoryId]);

  const fetchCategories = async () => {
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
  };

  const fetchArticles = async (pageNum: number, isInitial = false) => {
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
        setArticles(prev => [...prev, ...newArticles]);
      }

      // Check if there are more articles
      setHasMore(newArticles.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ArticleGrid articles={articles} loading={loading} />

        {/* Load More Button */}
        {!loading && hasMore && articles.length > 0 && (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="inline mr-1.5 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}

        {/* No more articles message */}
        {!loading && !hasMore && articles.length > 0 && (
          <div className="text-center mt-12 text-muted-foreground/80 text-xs">
            No more articles to load
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
