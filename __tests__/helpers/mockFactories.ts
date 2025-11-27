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

import type { ArticleId, AuthorId, CategoryId, RootId, UserId } from '@/types/branded.types';
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
 * Creates a minimal mock Article (for list views with minimal data)
 *
 * Use this for article list tests where full sentence data isn't needed
 */
export const createMockArticleMinimal = (
  overrides: Partial<Omit<Article, 'article_sentences'>> & {
    article_sentences?: ArticleSentence[];
  } = {},
): Article =>
  createMockArticle({
    article_sentences: [],
    ...overrides,
  });

/**
 * Creates a mock User ID
 *
 * Simple helper for consistent user ID creation
 */
export const createMockUserId = (id = 'user-123'): UserId => id as UserId;

/**
 * Creates a mock Reading Progress entry
 *
 * Tracks user progress through articles
 */
export const createMockReadingProgress = (
  overrides: Partial<Tables<'reading_progress'>> = {},
): Tables<'reading_progress'> => ({
  user_id: 'user-123',
  article_id: 1,
  completed_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock Bookmark entry
 *
 * User-saved articles for later listening/reading
 */
export const createMockBookmark = (
  overrides: Partial<Tables<'bookmarks'>> = {},
): Tables<'bookmarks'> => ({
  id: 1,
  user_id: 'user-123',
  article_id: 1,
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock Translation Improvement entry
 *
 * User-submitted corrections for translations
 */
export const createMockTranslationImprovement = (
  overrides: Partial<Tables<'translation_improvements'>> = {},
): Tables<'translation_improvements'> => ({
  id: 1,
  user_id: 'user-123',
  word_id: 1,
  improved_translation: 'Better translation',
  status: 'pending',
  created_at: new Date().toISOString(),
  reviewed_at: null,
  reviewed_by: null,
  ...overrides,
});

/**
 * Batch factory: Creates multiple articles at once
 *
 * Useful for testing article lists, filtering, and pagination
 */
export const createMockArticleList = (
  count: number,
  overridesFn?: (index: number) => Partial<Article>,
): Article[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockArticle({
      id: (i + 1) as ArticleId,
      title: `Article ${i + 1}`,
      ...(overridesFn ? overridesFn(i) : {}),
    }),
  );
};

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

/**
 * Creates an article with specific difficulty level
 *
 * Helper for testing difficulty-based filtering
 */
export const createMockArticleWithDifficulty = (
  difficultyLevel: number,
  overrides: Partial<Article> = {},
): Article =>
  createMockArticle({
    difficulty_level: difficultyLevel,
    ...overrides,
  });

/**
 * Creates an article with multiple sentences
 *
 * Helper for testing article content rendering
 */
export const createMockArticleWithSentences = (
  sentenceCount: number,
  overrides: Partial<Article> = {},
): Article => {
  const sentences = Array.from({ length: sentenceCount }, (_, i) =>
    createMockArticleSentence({
      id: 100 + i,
      position: i,
      arabic: `Sentence ${i + 1} in Arabic`,
      english: `Sentence ${i + 1} in English`,
    }),
  );

  return createMockArticle({
    article_sentences: sentences,
    ...overrides,
  });
};

/**
 * Creates a sentence with multiple words
 *
 * Helper for testing word-level interactions within sentences
 */
export const createMockSentenceWithWords = (
  wordCount: number,
  overrides: Partial<ArticleSentence> = {},
): ArticleSentence => {
  const words = Array.from({ length: wordCount }, (_, i) =>
    createMockSentenceWord({
      id: i + 1,
      position: i,
      word_form: `word${i + 1}`,
      english: `word ${i + 1}`,
    }),
  );

  return createMockArticleSentence({
    sentence_words: words,
    ...overrides,
  });
};

/**
 * Test Scenarios: Common article configurations
 *
 * Pre-configured article scenarios for common test cases
 */
export const articleScenarios = {
  /** New article with no user progress */
  unreadArticle: () =>
    createMockArticle({
      id: 1 as ArticleId,
      title: 'Unread Article',
    }),

  /** Article with bilingual audio */
  bilingualArticle: () =>
    createMockArticle({
      id: 2 as ArticleId,
      title: 'Bilingual Article',
      audio_url_bilingual: 'https://example.com/audio/bilingual.mp3',
    }),

  /** Article with no bilingual audio */
  arabicOnlyArticle: () =>
    createMockArticle({
      id: 3 as ArticleId,
      title: 'Arabic Only Article',
      audio_url_bilingual: null,
    }),

  /** Easy difficulty article */
  easyArticle: () =>
    createMockArticleWithDifficulty(1, {
      id: 4 as ArticleId,
      title: 'Easy Article',
    }),

  /** Hard difficulty article */
  hardArticle: () =>
    createMockArticleWithDifficulty(3, {
      id: 5 as ArticleId,
      title: 'Hard Article',
    }),

  /** Long article with many sentences */
  longArticle: () =>
    createMockArticleWithSentences(50, {
      id: 6 as ArticleId,
      title: 'Long Article',
    }),

  /** Short article with few sentences */
  shortArticle: () =>
    createMockArticleWithSentences(3, {
      id: 7 as ArticleId,
      title: 'Short Article',
    }),
};

/**
 * Test Scenarios: Common word configurations
 *
 * Pre-configured sentence word scenarios for common test cases
 */
export const wordScenarios = {
  /** Simple verb word */
  verbWord: () =>
    createMockSentenceWord({
      word_form: 'كَتَبَ',
      english: 'he wrote',
      word_type: createMockWordType({ id: 1, name: 'Verb' }),
    }),

  /** Noun word */
  nounWord: () =>
    createMockSentenceWord({
      word_form: 'كِتَابٌ',
      english: 'book',
      word_type: createMockWordType({ id: 2, name: 'Noun' }),
    }),

  /** Particle word */
  particleWord: () =>
    createMockSentenceWord({
      word_form: 'فِي',
      english: 'in',
      word_type: createMockWordType({ id: 3, name: 'Particle' }),
    }),

  /** Word with no root (particles, pronouns) */
  wordWithoutRoot: () =>
    createMockSentenceWord({
      word_form: 'هُوَ',
      english: 'he',
      root: null,
      root_id: 0 as RootId,
    }),

  /** Word with grammar note */
  wordWithGrammarNote: () =>
    createMockSentenceWord({
      word_form: 'الْكِتَابُ',
      english: 'the book',
      grammar_note: 'Definite article + noun in nominative case',
    }),
};

// ============================================================================
// SUPABASE QUERY MOCKS
// ============================================================================

/**
 * Response type for Supabase query mocks
 */
export interface SupabaseQueryResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/**
 * Creates a chainable Supabase query builder mock
 *
 * Supports all common query methods and can be awaited.
 * The response is returned when the chain is awaited or when
 * a terminal method like single() or maybeSingle() is called.
 *
 * @example
 * ```typescript
 * // Mock a successful query
 * const mockQuery = createSupabaseQueryMock({ data: [{ id: 1 }], error: null });
 * supabase.from.mockReturnValue(mockQuery);
 *
 * // Mock an error
 * const errorQuery = createSupabaseQueryMock({
 *   data: null,
 *   error: { message: 'Not found', code: 'PGRST116' }
 * });
 * ```
 */
export const createSupabaseQueryMock = <T>(
  response: SupabaseQueryResponse<T> = { data: null, error: null },
) => {
  const builder: Record<string, jest.Mock> & {
    then: (resolve: (value: SupabaseQueryResponse<T>) => void) => Promise<SupabaseQueryResponse<T>>;
  } = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    and: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    throwOnError: jest.fn().mockReturnThis(),
    // Make the builder thenable for await support
    then: (resolve: (value: SupabaseQueryResponse<T>) => void) =>
      Promise.resolve(response).then(resolve),
  };

  return builder;
};

/**
 * Creates a Supabase 'from' mock that returns a query builder
 *
 * @example
 * ```typescript
 * const mockFrom = createSupabaseFromMock([
 *   { id: 1, name: 'Test' }
 * ]);
 * supabase.from = mockFrom;
 * ```
 */
export const createSupabaseFromMock = <T>(data: T | null, error: { message: string } | null = null) =>
  jest.fn(() => createSupabaseQueryMock<T>({ data, error }));

/**
 * Creates a complete Supabase client mock for service tests
 *
 * @example
 * ```typescript
 * const mockSupabase = createSupabaseClientMock();
 * mockSupabase.from.mockImplementation((table) => {
 *   if (table === 'articles') {
 *     return createSupabaseQueryMock({ data: mockArticles, error: null });
 *   }
 *   return createSupabaseQueryMock({ data: null, error: null });
 * });
 * ```
 */
export const createSupabaseClientMock = () => ({
  from: jest.fn(() => createSupabaseQueryMock({ data: null, error: null })),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  storage: {
    from: jest.fn(() => ({
      getPublicUrl: jest.fn((path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } })),
      upload: jest.fn().mockResolvedValue({ data: { path: 'uploaded/file.txt' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
});
