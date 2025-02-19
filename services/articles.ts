import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { Article } from '../types/articles.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

export const articlesService = {
  async getArticles(categoryId?: number, authorId?: number): Promise<Article[]> {
    let query = supabase.from('articles').select(`
      *,
      category:categories(*),
      author:authors(*)
    `);

    if (categoryId) query = query.eq('category_id', categoryId);
    if (authorId) query = query.eq('author_id', authorId);

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data as Article[];
  },

  async getArticleById(id: number): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .select(
        `
        *,
        category:categories(*),
        author:authors(*),
        article_sentences(
          *,
          sentence_words(
            *,
            root:roots(*),
            word_type:word_types(*)
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Article with id ${id} not found`);
    return data as Article;
  },
};
