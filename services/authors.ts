import type { Tables } from '@/types/database.types';
import { handleError } from '@/utils/errorHandling';

import { supabase } from './supabase';

export const authorsService = {
  async getAuthors(): Promise<Tables<'authors'>[]> {
    const { data, error } = await supabase.from('authors').select('*').order('name');
    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: 'Failed to load authors',
      });
      throw error;
    }
    return (data ?? []) as Tables<'authors'>[];
  },

  async getAuthorsByCategory(categoryId: number): Promise<Tables<'authors'>[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('author:authors!inner(id, name)', {
        head: true,
      })
      .eq('category_id', categoryId)
      .order('name', { foreignTable: 'author' });

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: 'Failed to load authors',
      });
      throw error;
    }

    return (data ?? [])
      .map(item => (item as any).author as Tables<'authors'>)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
