import type { Tables } from '../types/database.types';

import { supabase } from './supabase';

export const authorsService = {
  async getAuthors(): Promise<Tables<'authors'>[]> {
    const { data, error } = await supabase.from('authors').select('*').order('name');
    if (error) throw error;
    return data as Tables<'authors'>[];
  },
};
