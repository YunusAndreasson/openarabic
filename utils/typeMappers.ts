import type {
  Article,
  ArticleRow,
  ArticleSentence,
  ArticleSentenceRow,
  SentenceWordRow,
} from '@/types/articles.types';
import type { ArticleId, AuthorId, CategoryId, RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';

function mapToSentenceWord(item: SentenceWordRow): SentenceWord {
  const base = item as Tables<'sentence_words'>;
  return {
    ...base,
    root_id: base.root_id as RootId,
    root: item.root ?? null,
    word_type: item.word_type ?? null,
  };
}

function mapToArticleSentence(item: ArticleSentenceRow): ArticleSentence {
  const base = item as Tables<'article_sentences'>;
  const sentenceWords = Array.isArray(item.sentence_words)
    ? item.sentence_words.map(mapToSentenceWord)
    : [];
  return {
    ...base,
    sentence_words: sentenceWords,
  };
}

export function mapToArticle(item: ArticleRow): Article {
  const base = item as Tables<'articles'>;

  // Ensure we have the required relations
  if (!item.category || !item.author) {
    throw new Error('Article missing required category or author data');
  }

  return {
    ...base,
    id: base.id as ArticleId,
    category_id: base.category_id as CategoryId,
    author_id: base.author_id as AuthorId,
    article_sentences: Array.isArray(item.article_sentences)
      ? item.article_sentences.map(mapToArticleSentence)
      : [],
    category: item.category,
    author: item.author,
  };
}

export function mapToArticles(items: ArticleRow[]): Article[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToArticle);
}
