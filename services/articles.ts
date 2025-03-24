import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { Article } from '../types/articles.types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define the columns needed for list view for better performance
const LIST_VIEW_COLUMNS = `
  id,
  title,
  image_url,
  created_at,
  difficulty_level,
  category_id,
  author_id,
  summary,
  audio_url,
  category:categories(id, name),
  author:authors(id, name)
`;

// Define the columns needed for detail view
const DETAIL_VIEW_COLUMNS = `
  *,
  category:categories(id, name),
  author:authors(id, name),
  article_sentences(
    id,
    position,
    arabic,
    english,
    article_id,
    sentence_words(
      id,
      position,
      word_form,
      english,
      difficulty_level,
      grammar_note,
      root_id,
      sentence_id,
      word_type_id,
      root:roots(id, letters, meaning),
      word_type:word_types(id, name)
    )
  )
`;

export const articlesService = {
  async getArticles(categoryId?: number, authorId?: number): Promise<Article[]> {
    let query = supabase.from('articles').select(LIST_VIEW_COLUMNS);

    if (categoryId) query = query.eq('category_id', categoryId);
    if (authorId) query = query.eq('author_id', authorId);

    // Order by creation date descending for freshest content first
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data as unknown as Article[];
  },

  async getArticleById(id: number): Promise<Article> {
    const { data, error } = await supabase
      .from('articles')
      .select(DETAIL_VIEW_COLUMNS)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Article with id ${id} not found`);
    return data as unknown as Article;
  },
};
