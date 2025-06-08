import type { Tables } from '@/types/database.types';

import { supabase } from './supabase';

export const categoriesService = {
  async getCategories(): Promise<Tables<'categories'>[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name');

    if (error) throw error;
    return (data ?? []) as Tables<'categories'>[];
  },

  async getCategory(id: number): Promise<Tables<'categories'> | null> {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();

    if (error) throw error;
    return (data as Tables<'categories'>) ?? null;
  },
};
