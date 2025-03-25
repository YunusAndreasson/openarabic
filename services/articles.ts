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
    console.log(
      `[articlesService] Fetching article id=${id} with columns: ${DETAIL_VIEW_COLUMNS.substring(0, 50)}...`
    );

    const { data, error } = await supabase
      .from('articles')
      .select(DETAIL_VIEW_COLUMNS)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`[articlesService] Error fetching article id=${id}:`, error);
      throw error;
    }

    if (!data) {
      console.error(`[articlesService] Article with id=${id} not found`);
      throw new Error(`Article with id ${id} not found`);
    }

    // Ensure article_sentences is always an array
    if (!data.article_sentences) {
      console.warn(
        `[articlesService] Article id=${id} has no article_sentences, initializing empty array`
      );
      data.article_sentences = [];
    }

    console.log(
      `[articlesService] Fetched article id=${id}, title=${data.title}, sentences=`,
      data.article_sentences ? data.article_sentences.length : 0
    );

    // Check if sentences have words
    if (data.article_sentences && data.article_sentences.length > 0) {
      console.log(
        `[articlesService] First sentence has ${
          data.article_sentences[0].sentence_words
            ? data.article_sentences[0].sentence_words.length
            : 'no'
        } words`
      );

      // Ensure each sentence has a sentence_words array
      data.article_sentences.forEach(sentence => {
        if (!sentence.sentence_words) {
          console.warn(
            `[articlesService] Sentence id=${sentence.id} is missing sentence_words, initializing empty array`
          );
          sentence.sentence_words = [];
        }
      });
    }

    return data as unknown as Article;
  },
};
