import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database.types';

export const categoriesService = {
  async getCategories(): Promise<Tables<'categories'>[]> {
    const { data, error } = await supabase.from('categories').select('id, name').order('name');

    if (error) throw error;
    return data ?? [];
  },
};
