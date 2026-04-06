import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { ArticlesClient } from '@/components/articles-client';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import { detectPlatform } from '@/lib/platform-detection';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];
type Author = Database['public']['Tables']['authors']['Row'];

/**
 * Homepage - Server component that fetches initial data
 * Renders on Cloudflare Workers for optimal performance
 * Category filtering is driven by URL searchParams for shareability and back/forward support
 */
export default async function PublicArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const categoryId = category ? parseInt(category, 10) : null;

  // Build the articles query with optional category filter
  let articlesQuery = supabase
    .from('articles')
    .select('*, authors(name), categories(name)')
    .order('created_at', { ascending: false })
    .range(0, ITEMS_PER_PAGE - 1);

  if (categoryId) {
    articlesQuery = articlesQuery.eq('category_id', categoryId);
  }

  // Fetch articles, categories, authors, and detect platform in parallel
  const [articlesResult, categoriesResult, authorsResult, platformInfo] =
    await Promise.all([
      articlesQuery,
      supabase.from('categories').select('*').order('name'),
      supabase.from('authors').select('*').order('name'),
      detectPlatform(),
    ]);

  const { data: articles, error: articlesError } = articlesResult;
  const { data: categories, error: categoriesError } = categoriesResult;
  const { data: authors, error: authorsError } = authorsResult;

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
  }

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
  }

  if (authorsError) {
    console.error('Error fetching authors:', authorsError);
  }

  return (
    <ArticlesClient
      initialArticles={(articles as Article[]) || []}
      initialCategories={(categories as Category[]) || []}
      initialAuthors={(authors as Author[]) || []}
      platformInfo={platformInfo}
      selectedCategoryId={categoryId}
    />
  );
}
