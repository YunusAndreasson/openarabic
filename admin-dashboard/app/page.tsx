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
 * Passes server-fetched data to client component for hydration
 */
export default async function PublicArticlesPage() {
  // Fetch initial articles, categories, authors, and detect platform in parallel on the server
  const [articlesResult, categoriesResult, authorsResult, platformInfo] =
    await Promise.all([
      supabase
        .from('articles')
        .select('*, authors(name), categories(name)')
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1),
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

  // Pass server-fetched data to client component
  return (
    <ArticlesClient
      initialArticles={(articles as Article[]) || []}
      initialCategories={(categories as Category[]) || []}
      initialAuthors={(authors as Author[]) || []}
      platformInfo={platformInfo}
    />
  );
}
