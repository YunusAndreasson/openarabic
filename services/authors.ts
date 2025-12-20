import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { AuthorRow } from '@/types/articles.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';

const errorConfig = {
  load: createServiceErrorConfig('authors', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
  }),
  loadArticleAuthors: createServiceErrorConfig('article_authors', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
    analyticsEventName: 'Article_Authors_Load_Error',
  }),
};

export const authorsService = {
  async getUniqueAuthors(): Promise<AuthorRow[]> {
    // Use a simpler approach - get all authors and filter by those with articles
    const allAuthors = await executeQuery(
      () => supabase.from('authors').select('id, name').order('name', { ascending: true }),
      errorConfig.load,
    );

    // Get unique author IDs from articles
    const articleAuthors = await executeQuery(
      () => supabase.from('articles').select('author_id').eq('published', true),
      errorConfig.loadArticleAuthors,
    );

    // Filter to only authors that have articles
    const authorIdsWithArticles = new Set(articleAuthors?.map(a => a.author_id) ?? []);
    const authorsWithArticles =
      allAuthors?.filter(author => authorIdsWithArticles.has(author.id)) ?? [];

    return authorsWithArticles;
  },
};
