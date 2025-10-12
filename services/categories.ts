import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database.types';
import { executeQuery } from '@/utils/supabaseHelpers';

export const categoriesService = {
  async getCategories(): Promise<Tables<'categories'>[]> {
    const data = await executeQuery(
      () => supabase.from('categories').select('id, name').order('name'),
      {
        toastMessage: STRINGS.FAILED_TO_LOAD_FILTER_OPTIONS,
        analyticsEventName: 'Categories_Load_Error',
      }
    );

    return data ?? [];
  },
};
