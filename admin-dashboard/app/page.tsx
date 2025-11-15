import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { ArticlesClient } from '@/components/articles-client';

type Article = Database['public']['Tables']['articles']['Row'] & {
  authors: { name: string } | null;
  categories: { name: string } | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

const ITEMS_PER_PAGE = 12;

// Server component - renders on Cloudflare Workers
export default async function PublicArticlesPage() {
  // Use existing Supabase client (works on both server and client)

  // Fetch initial articles on the server
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('*, authors(name), categories(name)')
    .order('created_at', { ascending: false })
    .range(0, ITEMS_PER_PAGE - 1);

  // Fetch categories on the server
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (articlesError) {
    console.error('Error fetching articles:', articlesError);
  }

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
  }

  // Pass server-fetched data to client component
  return (
    <ArticlesClient
      initialArticles={(articles as Article[]) || []}
      initialCategories={(categories as Category[]) || []}
    />
  );
}
