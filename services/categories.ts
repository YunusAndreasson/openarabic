import { createClient } from '@supabase/supabase-js';

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';
import type { Database, Tables } from '../types/database.types';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export const categoriesService = {
  async getCategories(): Promise<Tables<'categories'>[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name');

    if (error) throw error;
    return data as Tables<'categories'>[];
  },
};
