import type { AuthorRow } from '@/types/dbRow.types';
import { handleError } from '@/utils/errorHandling';

import { supabase } from './supabase';

export const authorsService = {
  async getAuthors(): Promise<AuthorRow[]> {
    const { data, error } = await supabase.from('authors').select('id, name').order('name');
    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: 'Failed to load authors',
      });
      throw error;
    }
    return (data ?? []) as AuthorRow[];
  },

  async getAuthorsByCategory(categoryId: number): Promise<AuthorRow[]> {
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

    return ((data ?? []) as unknown as { author: AuthorRow }[])
      .map(item => item.author)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
