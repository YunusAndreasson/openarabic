import { supabase } from '@/services/supabase';
import type { RootId } from '@/types/branded.types';
import { arabicHeadwordPattern, rankDictionaryEntries } from '@/utils/dictionarySearch';
import { executeQuery, managedRequest } from '@/utils/supabaseHelpers';

const SEARCH_RESULT_LIMIT = 60;
const errorConfig = { showToast: false, trackAnalytics: false, captureSentry: false };

export const dictionaryService = {
  search: async (term: string, signal: AbortSignal) => {
    const pattern = arabicHeadwordPattern(term);
    const rows = await executeQuery(
      () => {
        const query = supabase
          .from('roots')
          .select('id, letters, meaning, audio_url, audio_url_en');
        return (
          pattern ? query.filter('letters', 'match', pattern) : query.ilike('meaning', `%${term}%`)
        )
          .order('id')
          .limit(SEARCH_RESULT_LIMIT)
          .abortSignal(signal);
      },
      errorConfig,
      managedRequest(signal),
    );

    return rankDictionaryEntries(rows, term);
  },

  getEntry: (rootId: RootId, signal: AbortSignal) =>
    executeQuery(
      () =>
        supabase
          .from('roots')
          .select('id, letters, meaning, audio_url, audio_url_en')
          .eq('id', rootId)
          .abortSignal(signal)
          .maybeSingle(),
      errorConfig,
      managedRequest(signal),
    ),
};
