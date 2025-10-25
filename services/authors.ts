import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { AuthorRow } from '@/types/articles.types';
import { executeQuery } from '@/utils/supabaseHelpers';

/**
 * Result shape when selecting the `author` relation from `articles`.
 */
interface ArticleAuthorResult {
  author: AuthorRow;
}

export const authorsService = {
  async getAuthors(): Promise<AuthorRow[]> {
    const data = await executeQuery(
      () => supabase.from('authors').select('id, name').order('name').returns<AuthorRow[]>(),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
        analyticsEventName: 'Authors_Load_Error',
      },
    );

    return data ?? [];
  },

  async getUniqueAuthors(): Promise<AuthorRow[]> {
    // Use a simpler approach - get all authors and filter by those with articles
    const allAuthors = await executeQuery(
      () => supabase.from('authors').select('id, name').order('name', { ascending: true }),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
        analyticsEventName: 'Authors_Load_Error',
      },
    );

    // Get unique author IDs from articles
    const articleAuthors = await executeQuery(() => supabase.from('articles').select('author_id'), {
      toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
      analyticsEventName: 'Article_Authors_Load_Error',
    });

    // Filter to only authors that have articles
    const authorIdsWithArticles = new Set(articleAuthors?.map(a => a.author_id) ?? []);
    const authorsWithArticles =
      allAuthors?.filter(author => authorIdsWithArticles.has(author.id)) ?? [];

    return authorsWithArticles;
  },

  async getAuthorsByCategory(categoryId: number): Promise<AuthorRow[]> {
    const data = await executeQuery(
      () =>
        supabase
          .from('articles')
          .select('author:authors!inner(id, name)')
          .eq('category_id', categoryId)
          .order('name', { foreignTable: 'author' })
          .returns<ArticleAuthorResult[]>(),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
        analyticsEventName: 'Authors_By_Category_Load_Error',
        analyticsProperties: { categoryId },
      },
    );

    // Deduplicate authors by id to avoid repeating the same author per article
    const uniqueAuthorsMap = new Map<number, AuthorRow>();
    for (const row of data ?? []) {
      uniqueAuthorsMap.set(row.author.id, row.author);
    }
    return Array.from(uniqueAuthorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },
};
