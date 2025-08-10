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
    const { data, error } = await supabase
      .from('articles')
      .select('author:authors!inner(id, name)', {
        count: 'exact',
      })
      .order('author(name)', { ascending: true })
      .returns<ArticleAuthorResult[]>();

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
      });
      throw error;
    }

    // Build a map of unique authors to avoid duplicates
    const uniqueMap = new Map<number, AuthorRow>();
    for (const row of data ?? []) {
      uniqueMap.set(row.author.id, row.author);
    }
    return Array.from(uniqueMap.values());
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
