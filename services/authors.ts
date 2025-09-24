import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { AuthorRow } from '@/types/dbRow.types';
import { handleError } from '@/utils/errorHandling';

/**
 * Result shape when selecting the `author` relation from `articles`.
 */
interface ArticleAuthorResult {
  author: AuthorRow;
}

export const authorsService = {
  async getAuthors(): Promise<AuthorRow[]> {
    const { data, error } = await supabase
      .from('authors')
      .select('id, name')
      .order('name')
      .returns<AuthorRow[]>();

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
      });
      throw error;
    }
    return data ?? [];
  },

  async getUniqueAuthors(): Promise<AuthorRow[]> {
    // Use a simpler approach - get all authors and filter by those with articles
    const { data: allAuthors, error: authorsError } = await supabase
      .from('authors')
      .select('id, name')
      .order('name', { ascending: true });

    if (authorsError) {
      await handleError(new Error(authorsError.message), {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
      });
      throw authorsError;
    }

    // Get unique author IDs from articles
    const { data: articleAuthors, error: articlesError } = await supabase
      .from('articles')
      .select('author_id');

    if (articlesError) {
      await handleError(new Error(articlesError.message), {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
      });
      throw articlesError;
    }

    // Filter to only authors that have articles
    const authorIdsWithArticles = new Set(articleAuthors?.map(a => a.author_id) ?? []);
    const authorsWithArticles =
      allAuthors?.filter(author => authorIdsWithArticles.has(author.id)) ?? [];

    return authorsWithArticles;
  },

  async getAuthorsByCategory(categoryId: number): Promise<AuthorRow[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('author:authors!inner(id, name)')
      .eq('category_id', categoryId)
      .order('name', { foreignTable: 'author' })
      .returns<ArticleAuthorResult[]>();

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
      });
      throw error;
    }

    // Deduplicate authors by id to avoid repeating the same author per article
    const uniqueAuthorsMap = new Map<number, AuthorRow>();
    for (const row of data ?? []) {
      uniqueAuthorsMap.set(row.author.id, row.author);
    }
    return Array.from(uniqueAuthorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },
};
