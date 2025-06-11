import type { Tables } from '@/types/database.types';
import { supabase } from './supabase';
import { handleError } from '@/utils/errorHandling';

export const authorsService = {
  async getAuthors(): Promise<Tables<'authors'>[]> {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .order('name');
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
      .select('author:authors(id, name)')
      .eq('category_id', categoryId);

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: 'Failed to load authors',
      });
      throw error;
    }

    const map = new Map<number, Tables<'authors'>>();
    (data || []).forEach(item => {
      const author = (item as any).author as Tables<'authors'> | null;
      if (author) {
        map.set(author.id, author);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  },
};
