import { supabase } from '@/services/supabase';
import type { AuthorRow } from '@/types/dbRow.types';
import { handleError } from '@/utils/errorHandling';

export const authorsService = {
  async getAuthors(): Promise<AuthorRow[]> {
    const { data, error } = await supabase.from('authors').select('id, name').order('name');

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: 'Failed to load authors',
      });
      throw error;
    }
    return data ?? [];
  },

  async getUniqueAuthors(): Promise<AuthorRow[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('author:authors!inner(id, name)', {
        count: 'exact',
      })
      .order('author(name)', { ascending: true });

    if (error) {
      await handleError(new Error(error.message), {
        toastMessage: 'Failed to load authors',
      });
      throw error;
    }

    // Extract unique authors and ensure no duplicates
    const uniqueAuthors = (data ?? [])
      .map(item => (item as any).author)
      .filter((author, index, self) => index === self.findIndex(a => a.id === author.id));

    return uniqueAuthors;
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

    return (data ?? [])
      .map(item => (item as any).author)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
