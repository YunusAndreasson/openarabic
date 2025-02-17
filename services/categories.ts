import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import type { Tables } from '../types/database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export const categoriesService = {
  async getCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name');

    if (error) throw error;
    return data as Tables<'categories'>[];
  },
};
