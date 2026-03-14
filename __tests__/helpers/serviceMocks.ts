/**
 * Service Mock Factories
 *
 * Provides consistent mock data factories for API responses and database entities.
 * Eliminates duplicate mock data across tests and ensures type safety.
 *
 * Usage:
 * ```typescript
 * import { createArticleMock, createReadingListMock } from '@/__tests__/helpers/serviceMocks';
 *
 * // In tests
 * mockSupabase.from('articles').select().mockResolvedValue({
 *   data: [createArticleMock(), createArticleMock({ id: 2, title: 'Test 2' })],
 *   error: null,
 * });
 * ```
 *
 * Modern Jest 29 Patterns:
 * - Type-safe factory functions
 * - Branded ID support for type safety
 */

import type { EnhancedAudioTrack } from '@/types/audio.types';
import type { ArticleId, RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { StudyWord } from '@/types/vocabulary.types';

// ============================================================================
// ARTICLE FACTORIES
// ============================================================================

/**
 * Creates a mock article with sensible defaults
 */
export const createArticleMock = (
  overrides: Partial<Tables<'articles'>> = {},
): Tables<'articles'> => ({
  id: 1,
  title: 'Test Article',
  summary: 'A test article summary',
  audio_url: 'https://example.com/audio.mp3',
  audio_url_bilingual: 'https://example.com/audio-bilingual.mp3',
  image_url: 'https://example.com/image.jpg',
  author_id: 1,
  category_id: 1,
  difficulty_level: 1,
  content_hash: 'abc123',
  created_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock article sentence
 */
export const createSentenceMock = (
  overrides: Partial<Tables<'article_sentences'>> = {},
): Tables<'article_sentences'> => ({
  id: 1,
  article_id: 1,
  position: 0,
  arabic: 'مرحبا',
  english: 'Hello',
  audio_url: 'https://example.com/sentence.mp3',
  audio_url_english: 'https://example.com/sentence-en.mp3',
  audio_url_bilingual: 'https://example.com/sentence-bilingual.mp3',
  arabic_repeat: false,
  english_repeat: false,
  ...overrides,
});

/**
 * Creates a mock author
 */
export const createAuthorMock = (
  overrides: Partial<Tables<'authors'>> = {},
): Tables<'authors'> => ({
  id: 1,
  name: 'Test Author',
  ...overrides,
});

/**
 * Creates a mock category
 */
export const createCategoryMock = (
  overrides: Partial<Tables<'categories'>> = {},
): Tables<'categories'> => ({
  id: 1,
  name: 'Test Category',
  ...overrides,
});

// ============================================================================
// VOCABULARY FACTORIES
// ============================================================================

/**
 * Creates a mock root word
 */
export const createRootMock = (overrides: Partial<Tables<'roots'>> = {}): Tables<'roots'> => ({
  id: 1,
  letters: 'ك ت ب',
  meaning: 'to write',
  audio_url: 'https://example.com/root.mp3',
  audio_url_en: 'https://example.com/root-en.mp3',
  ...overrides,
});

/**
 * Creates a mock sentence word with type safety
 */
export const createSentenceWordMock = (
  overrides: Partial<Tables<'sentence_words'>> = {},
): Tables<'sentence_words'> => ({
  id: 1,
  sentence_id: 1,
  position: 0,
  word_form: 'كتب',
  english: 'wrote',
  root_id: 1,
  word_type_id: 1,
  difficulty_level: 1,
  grammar_note: null,
  audio_url: 'https://example.com/word.mp3',
  ...overrides,
});

/**
 * Creates a mock word type
 */
export const createWordTypeMock = (
  overrides: Partial<Tables<'word_types'>> = {},
): Tables<'word_types'> => ({
  id: 1,
  name: 'verb',
  ...overrides,
});

/**
 * Creates a mock study word with FSRS data
 * Re-exports from fsrsTestHelpers for consistency
 */
export { createTestWord as createStudyWordMock } from './fsrsTestHelpers';

// ============================================================================
// READING PROGRESS FACTORIES
// ============================================================================

/**
 * Creates a mock reading progress entry
 */
export const createReadingProgressMock = (
  overrides: Partial<Tables<'reading_progress'>> = {},
): Tables<'reading_progress'> => ({
  user_id: 'test-user-id',
  article_id: 1,
  last_sentence_read: 0,
  total_sentences: 10,
  progress_percentage: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Creates a mock reading list entry
 */
export const createReadingListMock = (
  overrides: Partial<Tables<'reading_list'>> = {},
): Tables<'reading_list'> => ({
  user_id: 'test-user-id',
  article_id: 1,
  added_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// AUDIO TRACK FACTORIES
// ============================================================================

/**
 * Creates a mock enhanced audio track
 */
export const createEnhancedAudioTrackMock = (
  overrides: Partial<EnhancedAudioTrack> = {},
): EnhancedAudioTrack => ({
  id: 'article-1',
  audioUrl: 'https://example.com/audio.mp3',
  articleId: 1 as ArticleId,
  title: 'Test Article',
  artist: 'Test Author',
  imageUrl: 'https://example.com/image.jpg',
  ...overrides,
});

// ============================================================================
// API RESPONSE FACTORIES
// ============================================================================

/**
 * Creates a successful Supabase response
 */
export const createSuccessResponse = <T>(data: T) => ({
  data,
  error: null,
  count: Array.isArray(data) ? data.length : null,
  status: 200,
  statusText: 'OK',
});

/**
 * Creates an error Supabase response
 */
export const createErrorResponse = (
  message: string,
  code: string = 'PGRST116',
  details: string = '',
) => ({
  data: null,
  error: {
    message,
    code,
    details,
    hint: '',
  },
  count: null,
  status: 400,
  statusText: 'Bad Request',
});

/**
 * Creates a not found Supabase response
 */
export const createNotFoundResponse = () =>
  createErrorResponse('No rows found', 'PGRST116', 'The result contains 0 rows');

/**
 * Creates a network error response
 */
export const createNetworkErrorResponse = () =>
  createErrorResponse('Network request failed', 'NETWORK_ERROR', 'Unable to reach the server');

// ============================================================================
// BATCH DATA FACTORIES
// ============================================================================

/**
 * Creates an array of mock articles with sequential IDs
 */
export const createArticlesMock = (
  count: number,
  overrides: Partial<Tables<'articles'>> = {},
): Tables<'articles'>[] =>
  Array.from({ length: count }, (_, i) =>
    createArticleMock({
      id: i + 1,
      title: `Test Article ${i + 1}`,
      ...overrides,
    }),
  );

/**
 * Creates an array of mock reading list entries with sequential article IDs
 */
export const createReadingListArrayMock = (
  articleIds: number[],
  userId: string = 'test-user-id',
): Tables<'reading_list'>[] =>
  articleIds.map((article_id, i) =>
    createReadingListMock({
      article_id,
      user_id: userId,
      added_at: new Date(Date.now() - i * 86400000).toISOString(), // Each day older
    }),
  );

/**
 * Creates an array of mock enhanced audio tracks
 */
export const createEnhancedAudioTracksMock = (
  count: number,
  overrides: Partial<EnhancedAudioTrack> = {},
): EnhancedAudioTrack[] =>
  Array.from({ length: count }, (_, i) =>
    createEnhancedAudioTrackMock({
      articleId: (i + 1) as ArticleId,
      title: `Track ${i + 1}`,
      ...overrides,
    }),
  );

// ============================================================================
// USER & AUTH FACTORIES
// ============================================================================

/**
 * Creates a mock Supabase user
 */
export const createUserMock = (
  overrides: Partial<{
    id: string;
    email: string;
    created_at: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  }> = {},
) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
  ...overrides,
});

/**
 * Creates a mock Supabase session
 */
export const createSessionMock = (
  overrides: Partial<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    user: ReturnType<typeof createUserMock>;
  }> = {},
) => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: createUserMock(),
  ...overrides,
});
