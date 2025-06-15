import type { Article, ArticleSentence } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';
import type { ArticleRow, ArticleSentenceRow, SentenceWordRow } from '@/types/dbRow.types';
import type { SentenceWord } from '@/types/vocabulary.types';

function mapToSentenceWord(item: SentenceWordRow): SentenceWord {
  const base = item as Tables<'sentence_words'>;
  return {
    ...base,
    root: item.root ?? null,
    word_type: item.word_type ?? null,
    audio_start: item.audio_start ?? null,
    audio_end: item.audio_end ?? null,
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
  return {
    ...base,
    article_sentences: item.article_sentences.map(mapToArticleSentence),
    category: item.category,
    author: item.author,
    audio_url: item.audio_url,
  };
}

export function mapToArticles(items: ArticleRow[]): Article[] {
  if (!Array.isArray(items)) return [];
  return items.map(mapToArticle);
}
