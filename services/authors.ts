import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { AuthorRow } from '@/types/articles.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery, type RequestOptions } from '@/utils/supabaseHelpers';

const errorConfig = {
  load: createServiceErrorConfig('authors', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_AUTHORS,
  }),
};

export const authorsService = {
  /**
   * Every author with at least one published article, by name.
   *
   * One request. The empty `articles!inner()` embed is an existence filter: it
   * keeps only the authors that have a matching (published) article and adds
   * no column to the row, so the typed result is exactly `{ id, name }`. It
   * replaced two requests and a client-side filter whose second request read
   * every published article's `author_id` — a scan PostgREST would also have
   * truncated at 1000 rows.
   */
  getUniqueAuthors(request: RequestOptions = {}): Promise<AuthorRow[]> {
    return executeQuery(
      () =>
        supabase
          .from('authors')
          .select('id, name, articles!inner()')
          .eq('articles.published', true)
          .order('name', { ascending: true }),
      errorConfig.load,
      request,
    );
  },
};
