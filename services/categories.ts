import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery, type RequestOptions } from '@/utils/supabaseHelpers';

const errorConfig = {
  load: createServiceErrorConfig('categories', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_FILTER_OPTIONS,
  }),
};

export const categoriesService = {
  getCategories(request: RequestOptions = {}): Promise<Tables<'categories'>[]> {
    return executeQuery(
      () => supabase.from('categories').select('id, name').order('name'),
      errorConfig.load,
      request,
    );
  },
};
