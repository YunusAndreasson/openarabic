import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { ArticlesClient } from '@/components/articles-client';
import { AppStructuredData } from '@/components/app-structured-data';
import { ITEMS_PER_PAGE } from '@/lib/constants';
import { detectPlatform } from '@/lib/platform-detection';
import type { Article, Category, Author } from '@/lib/types';

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { category } = await searchParams;
  if (!category) return {};

  const { data } = await supabase
    .from('categories')
    .select('name')
    .eq('id', parseInt(category, 10))
    .single();

  if (!data) return {};

  return {
    title: `${data.name} Articles - OpenArabic`,
  };
}

/**
 * Homepage - Server component that fetches initial data
 * Renders on Cloudflare Workers for optimal performance
 * Category filtering is driven by URL searchParams for shareability and back/forward support
 */
export default async function PublicArticlesPage({ searchParams }: PageProps) {
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
    <>
      <AppStructuredData />
      <ArticlesClient
        initialArticles={(articles as Article[]) || []}
        initialCategories={(categories as Category[]) || []}
        initialAuthors={(authors as Author[]) || []}
        platformInfo={platformInfo}
        selectedCategoryId={categoryId}
      />
    </>
  );
}
