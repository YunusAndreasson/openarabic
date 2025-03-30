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
  author:authors(id, name),
  article_sentences:article_sentences(id)
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

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(`Article with id ${id} not found`);
    }

    // Initialize empty arrays for data consistency
    if (!data.article_sentences) {
      data.article_sentences = [];
    }

    if (data.article_sentences && data.article_sentences.length > 0) {
      data.article_sentences.forEach(sentence => {
        if (!sentence.sentence_words) {
          sentence.sentence_words = [];
        }
      });
    }

    return data as unknown as Article;
  },

  async getRelatedArticles(articleId: number): Promise<Article[]> {
    // Get the article's category first
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('category_id')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return [];
    }

    // Get related articles from the same category
    const { data, error } = await supabase
      .from('articles')
      .select(LIST_VIEW_COLUMNS)
      .eq('category_id', article.category_id)
      .neq('id', articleId) // Exclude current article
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return [];
    }

    return data as unknown as Article[];
  },

  async getOtherCategoryArticles(categoryId: number): Promise<Article[]> {
    const { data, error } = await supabase
      .from('articles')
      .select(LIST_VIEW_COLUMNS)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return [];
    }

    return data as unknown as Article[];
  },
};
