import { createClient } from '@supabase/supabase-js';
import { Database, Tables } from '../types/database.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export const articlesService = {
  async getArticles(categoryId?: number, authorId?: number): Promise<Tables<'articles'>[]> {
    let query = supabase.from('articles').select('*, categories(*)');

    if (categoryId) query = query.eq('category_id', categoryId);
    if (authorId) query = query.eq('author_id', authorId);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getArticleById(id: number): Promise<Tables<'articles'>> {
    const { data, error } = await supabase
      .from('articles')
      .select('*, categories(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Article with id ${id} not found`);
    return data;
  },
};
