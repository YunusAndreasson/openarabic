import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { parseTrailingId } from '@/lib/slugify';
import type { Article, Author } from '@/lib/types';

export const SITE_URL = 'https://openarabic.io';

// Pure slug/path builders live in author-slug.ts (client-safe). Re-exported
// here so server code has a single author module to import from.
export { authorSlug, authorPath } from '@/lib/author-slug';

export { parseTrailingId as parseAuthorId };

export interface AuthorWithArticles {
  author: Author;
  articles: Article[];
}

/**
 * Fetch an author and their published articles (newest first).
 * cache() dedupes the author lookup across generateMetadata + the page render.
 */
export const getAuthorWithArticles = cache(
  async (authorId: number): Promise<AuthorWithArticles | null> => {
    const { data: author, error } = await supabase
      .from('authors')
      .select('*')
      .eq('id', authorId)
      .single();

    if (error || !author) return null;

    const { data: articles } = await supabase
      .from('articles')
      .select('*, authors(name), categories(name)')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });

    return { author, articles: (articles as Article[]) || [] };
  },
);

/** All authors, for the sitemap. */
export async function getAuthorsForSitemap(): Promise<Author[]> {
  const { data } = await supabase.from('authors').select('id, name').order('name');
  return (data as Author[]) || [];
}
