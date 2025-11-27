/**
 * Mock Data Factories
 *
 * Factory functions for creating consistent test data across all tests.
 * These factories provide sensible defaults with the ability to override specific fields.
 *
 * Usage:
 * ```typescript
 * const article = createMockArticle({ id: 1, title: 'Custom Title' });
 * const word = createMockSentenceWord({ word_form: 'كَتَبَ', english: 'he wrote' });
 * ```
 *
 * Note: For StudyWord factories, see __tests__/helpers/fsrsTestHelpers.ts
 */

import type { ArticleId, AuthorId, CategoryId, RootId } from '@/types/branded.types';
import type {
  Article,
  ArticleSentence,
  Author,
  Category,
  SentenceWordRow,
} from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import type { Tables } from '@/types/database.types';

/**
 * Creates a mock Root (Arabic root word)
 *
 * Roots are the core morphological units in Arabic language
 */
export const createMockRoot = (overrides: Partial<Tables<'roots'>> = {}): Tables<'roots'> => ({
  id: 1,
  letters: 'كتب',
  meaning: 'to write',
  audio_url: 'https://example.com/audio/root-1.mp3',
  audio_url_en: 'https://example.com/audio/root-1-en.mp3',
  ...overrides,
});

/**
 * Creates a mock Category
 *
 * Categories organize articles by topic (Quran, Hadith, etc.)
 */
export const createMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: 'Quran',
  ...overrides,
});

/**
 * Creates a mock Author
 *
 * Authors are the content creators for articles
 */
export const createMockAuthor = (overrides: Partial<Author> = {}): Author => ({
  id: 1 as AuthorId,
  name: 'Test Author',
  ...overrides,
});

/**
 * Creates a mock WordType
 *
 * Word types classify grammatical categories (noun, verb, particle, etc.)
 */
export const createMockWordType = (
  overrides: Partial<Tables<'word_types'>> = {},
): Tables<'word_types'> => ({
  id: 1,
  name: 'Verb',
  ...overrides,
});

/**
 * Creates a mock SentenceWord (word within a sentence with root and grammar info)
 *
 * SentenceWords are the core vocabulary units shown in articles
 */
export const createMockSentenceWord = (overrides: Partial<SentenceWord> = {}): SentenceWord => ({
  id: 1,
  sentence_id: 100,
  word_form: 'كَتَبَ',
  english: 'he wrote',
  root_id: 1 as RootId,
  root: createMockRoot(),
  word_type_id: 1,
  word_type: createMockWordType(),
  difficulty_level: 1,
  position: 0,
  audio_url: 'https://example.com/audio/word-1.mp3',
  grammar_note: null,
  sentence: null,
  ...overrides,
});

/**
 * Creates a raw SentenceWordRow (database row before transformation)
 *
 * Used in service layer tests
 */
export const createMockSentenceWordRow = (
  overrides: Partial<SentenceWordRow> = {},
): SentenceWordRow => ({
  id: 1,
  sentence_id: 100,
  word_form: 'كَتَبَ',
  english: 'he wrote',
  root_id: 1,
  root: createMockRoot(),
  word_type_id: 1,
  word_type: createMockWordType(),
  difficulty_level: 1,
  position: 0,
  audio_url: 'https://example.com/audio/word-1.mp3',
  grammar_note: null,
  ...overrides,
});

/**
 * Creates a mock ArticleSentence (sentence with words)
 *
 * ArticleSentences are the building blocks of articles
 */
export const createMockArticleSentence = (
  overrides: Partial<ArticleSentence> = {},
): ArticleSentence => ({
  id: 100,
  article_id: 1,
  arabic: 'كَتَبَ الطَّالِبُ الدَّرْسَ',
  english: 'The student wrote the lesson',
  audio_url: 'https://example.com/audio/sentence-100.mp3',
  audio_url_bilingual: 'https://example.com/audio/sentence-100-bilingual.mp3',
  audio_url_english: 'https://example.com/audio/sentence-100-english.mp3',
  position: 0,
  arabic_repeat: null,
  english_repeat: null,
  sentence_words: [createMockSentenceWord()],
  ...overrides,
});

/**
 * Creates a mock Article (full article with sentences and metadata)
 *
 * Articles are the main content units in the app
 */
export const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 1 as ArticleId,
  title: 'Test Article',
  summary: 'This is a test article summary',
  difficulty_level: 1,
  audio_url: 'https://example.com/audio/article-1.mp3',
  audio_url_bilingual: 'https://example.com/audio/article-1-bilingual.mp3',
  image_url: 'https://example.com/images/article-1.jpg',
  content_hash: 'abc123',
  created_at: new Date('2024-01-01').toISOString(),
  category_id: 1 as CategoryId,
  category: createMockCategory(),
  author_id: 1 as AuthorId,
  author: createMockAuthor(),
  article_sentences: [createMockArticleSentence()],
  ...overrides,
});

/**
 * Batch factory: Creates multiple sentence words at once
 *
 * Useful for testing word highlighting, vocabulary selection
 */
export const createMockSentenceWordList = (
  count: number,
  overridesFn?: (index: number) => Partial<SentenceWord>,
): SentenceWord[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockSentenceWord({
      id: i + 1,
      position: i,
      word_form: `word${i + 1}`,
      english: `word ${i + 1}`,
      ...(overridesFn ? overridesFn(i) : {}),
    }),
  );
};
