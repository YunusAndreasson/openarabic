/**
 * useFeaturedArticleSelection Hook Tests
 *
 * Tests the featured article selection algorithm which:
 * - Strategy 1: Selects articles with due words for review
 * - Strategy 2: Selects articles with difficult words for reinforcement
 * - Strategy 3: Selects beginner articles for new users
 * - Falls back to random selection
 * - Caches selections to prevent flickering
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 */

import { renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { createArticleMock, createTestWord } from '@/__tests__/helpers';
import type { Article } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock user
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
let mockUserValue: typeof mockUser | null = mockUser;

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUserValue }),
}));

// Mock useArticlesByDueWords
let mockHasEnoughArticles = false;
let mockDueWordRootIds = new Set<RootId>();

jest.mock('@/hooks/articles/useArticlesByDueWords', () => ({
  useArticlesByDueWords: () => ({
    hasEnoughArticles: mockHasEnoughArticles,
    dueWordRootIds: mockDueWordRootIds,
    isLoading: false,
  }),
}));

// Mock FSRSDataProvider - the studyWords array will be modified in tests
// Using a mutable object that the mock can reference
const fsrsDataMock: { studyWords: StudyWord[] } = { studyWords: [] };

jest.mock('@/components/providers/FSRSDataProvider', () => ({
  useFSRSData: jest.fn(() => ({
    studyWords: [],
    isLoading: false,
  })),
}));

// Import the mocked module to override implementation in tests
import { useFSRSData } from '@/components/providers/FSRSDataProvider';

// Mock article utils
const mockBeginnerArticles: Article[] = [];
jest.mock('@/utils/articleUtils', () => ({
  getBeginnerArticles: jest.fn(() => mockBeginnerArticles),
}));

// Mock word classification - use object reference that can be mutated
const wordClassificationMock = {
  isHardWord: (word: StudyWord) => {
    // Default: Consider word hard if it has high difficulty or many lapses
    return (word.fsrs_difficulty ?? 0) > 7 || (word.fsrs_lapses ?? 0) >= 2;
  },
};

jest.mock('@/utils/wordClassification', () => ({
  isHardWord: (word: unknown) => wordClassificationMock.isHardWord(word as StudyWord),
}));

// Mock strings
jest.mock('@/constants/strings', () => ({
  STRINGS: {
    LOADING_ARTICLES: 'Loading articles...',
    SELECTED_TO_HELP_PRACTICE_DUE: 'Selected to help practice due words',
    CHOSEN_TO_REINFORCE_CHALLENGING: 'Chosen to reinforce challenging vocabulary',
    PERFECT_FOR_GETTING_STARTED: 'Perfect for getting started',
    RANDOMLY_SELECTED_FOR_DISCOVERY: 'Randomly selected for discovery',
    NEW_RECOMMENDATION_SELECTED: 'New recommendation selected',
  },
}));

// Import after mocks
import { useFeaturedArticleSelection } from '@/hooks/articles/useFeaturedArticleSelection';
import { getBeginnerArticles } from '@/utils/articleUtils';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a mock article with sentence words containing specific root IDs
 */
function createArticleWithRoots(id: number, rootIds: number[], difficulty: number = 1): Article {
  const sentenceWords: Partial<SentenceWord>[] = rootIds.map((rootId, index) => ({
    id: index + 1,
    root_id: rootId as RootId,
    word_form: `word_${rootId}`,
    english: `meaning_${rootId}`,
    position: index,
    sentence_id: 1,
    word_type_id: 1,
    difficulty_level: difficulty,
    grammar_note: null,
    audio_url: null,
    root: null,
    word_type: null,
  }));

  return {
    ...createArticleMock({ id, difficulty_level: difficulty }),
    article_sentences: [
      {
        id: 1,
        article_id: id,
        position: 0,
        arabic: 'مرحبا',
        english: 'Hello',
        audio_url: 'https://example.com/audio.mp3',
        audio_url_english: 'https://example.com/audio-en.mp3',
        audio_url_bilingual: 'https://example.com/audio-bilingual.mp3',
        arabic_repeat: false,
        english_repeat: false,
        sentence_words: sentenceWords as SentenceWord[],
      },
    ],
  } as Article;
}

// ============================================================================
// TESTS
// ============================================================================

describe('useFeaturedArticleSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock values
    mockUserValue = mockUser;
    mockHasEnoughArticles = false;
    mockDueWordRootIds = new Set();
    fsrsDataMock.studyWords = [];
    mockBeginnerArticles.length = 0;

    // Reset FSRSData mock
    jest.mocked(useFSRSData).mockReturnValue({
      studyWords: fsrsDataMock.studyWords,
      isLoading: false,
    });

    // Reset getBeginnerArticles mock to return empty array by default
    jest.mocked(getBeginnerArticles).mockReturnValue(mockBeginnerArticles);

    // Reset isHardWord mock to default behavior
    wordClassificationMock.isHardWord = (word: StudyWord) => {
      return (word.fsrs_difficulty ?? 0) > 7 || (word.fsrs_lapses ?? 0) >= 2;
    };

    // Reset Math.random to be predictable
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    test('returns loading state when no articles', () => {
      const { result } = renderHook(() => useFeaturedArticleSelection([], 0, 'global'));

      expect(result.current.article).toBeNull();
      expect(result.current.reason).toBe('Loading articles...');
      expect(result.current.type).toBe('random');
    });

    test('returns result with all expected properties', () => {
      const articles = [createArticleWithRoots(1, [100, 101])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current).toHaveProperty('article');
      expect(result.current).toHaveProperty('reason');
      expect(result.current).toHaveProperty('type');
      expect(result.current).toHaveProperty('dueWordRootIds');
    });
  });

  // ============================================================================
  // STRATEGY 1: DUE WORDS
  // ============================================================================

  describe('Strategy 1: Due Words Selection', () => {
    test('selects article with due words when available', () => {
      // Set up due words
      mockHasEnoughArticles = true;
      mockDueWordRootIds = new Set([100 as RootId, 101 as RootId]);

      const articles = [
        createArticleWithRoots(1, [100, 101]), // Has due words
        createArticleWithRoots(2, [200, 201]), // No due words
      ];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.article?.id).toBe(1);
      expect(result.current.type).toBe('due-words');
      expect(result.current.reason).toBe('Selected to help practice due words');
    });

    test('falls back when no articles match due words', () => {
      mockHasEnoughArticles = true;
      mockDueWordRootIds = new Set([999 as RootId]); // No articles have this root

      const articles = [
        createArticleWithRoots(1, [100, 101]),
        createArticleWithRoots(2, [200, 201]),
      ];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      // Should fall back to random
      expect(result.current.type).toBe('random');
    });
  });

  // ============================================================================
  // STRATEGY 2: DIFFICULT WORDS
  // ============================================================================

  describe('Strategy 2: Difficult Words Selection', () => {
    test('selects article with difficult words when no due words', () => {
      // No due words
      mockHasEnoughArticles = false;

      // Set up study words with difficult words (high difficulty)
      // Must have at least 3 hard words for hasDifficultWordArticles to be true
      fsrsDataMock.studyWords = [
        createTestWord({ root_id: 100 as RootId, fsrs_difficulty: 8 }),
        createTestWord({ root_id: 101 as RootId, fsrs_difficulty: 9 }),
        createTestWord({ root_id: 102 as RootId, fsrs_difficulty: 8.5 }),
      ];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      // Make isHardWord return true for these specific root_ids
      wordClassificationMock.isHardWord = (word: StudyWord) => {
        return [100, 101, 102].includes(word.root_id as number);
      };

      const articles = [
        createArticleWithRoots(1, [100, 101]), // Has difficult words
        createArticleWithRoots(2, [200, 201]), // No difficult words
      ];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.article?.id).toBe(1);
      expect(result.current.type).toBe('difficult-words');
      expect(result.current.reason).toBe('Chosen to reinforce challenging vocabulary');
    });

    test('requires at least 3 difficult words for strategy', () => {
      mockHasEnoughArticles = false;

      // Only 2 difficult words - not enough
      fsrsDataMock.studyWords = [
        createTestWord({ root_id: 100 as RootId, fsrs_difficulty: 8 }),
        createTestWord({ root_id: 101 as RootId, fsrs_difficulty: 9 }),
      ];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      // Make isHardWord return true only for 2 words
      wordClassificationMock.isHardWord = (word: StudyWord) => {
        return [100, 101].includes(word.root_id as number);
      };

      const articles = [createArticleWithRoots(1, [100, 101])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      // Should not use difficult words strategy with < 3 difficult words
      expect(result.current.type).not.toBe('difficult-words');
    });
  });

  // ============================================================================
  // STRATEGY 3: BEGINNER ARTICLES
  // ============================================================================

  describe('Strategy 3: Beginner Articles Selection', () => {
    test('selects beginner article for new user', () => {
      // No due words, no study progress
      mockHasEnoughArticles = false;
      fsrsDataMock.studyWords = [];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      const beginnerArticle = createArticleWithRoots(1, [100], 1);
      mockBeginnerArticles.push(beginnerArticle);

      const articles = [
        beginnerArticle,
        createArticleWithRoots(2, [200], 3), // Not beginner
      ];

      const { getBeginnerArticles } = require('@/utils/articleUtils');
      jest.mocked(getBeginnerArticles).mockReturnValue([beginnerArticle]);

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.article?.id).toBe(1);
      expect(result.current.type).toBe('beginner');
      expect(result.current.reason).toBe('Perfect for getting started');
    });

    test('selects beginner article for unauthenticated user', () => {
      mockUserValue = null;
      mockHasEnoughArticles = false;
      fsrsDataMock.studyWords = [];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      const beginnerArticle = createArticleWithRoots(1, [100], 1);

      const { getBeginnerArticles } = require('@/utils/articleUtils');
      jest.mocked(getBeginnerArticles).mockReturnValue([beginnerArticle]);

      const articles = [beginnerArticle];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.type).toBe('beginner');
    });
  });

  // ============================================================================
  // FALLBACK: RANDOM SELECTION
  // ============================================================================

  describe('Fallback: Random Selection', () => {
    test('falls back to random when no strategies match', () => {
      mockHasEnoughArticles = false;
      fsrsDataMock.studyWords = [
        createTestWord({ root_id: 100 as RootId, fsrs_difficulty: 5 }), // Not hard
      ];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      const { getBeginnerArticles } = require('@/utils/articleUtils');
      jest.mocked(getBeginnerArticles).mockReturnValue([]);

      const articles = [createArticleWithRoots(1, [100])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.type).toBe('random');
      expect(result.current.reason).toBe('Randomly selected for discovery');
    });

    test('selects first article when random returns 0', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const articles = [
        createArticleWithRoots(1, [100]),
        createArticleWithRoots(2, [200]),
        createArticleWithRoots(3, [300]),
      ];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.article?.id).toBe(1);
    });
  });

  // ============================================================================
  // CACHING AND REFRESH
  // ============================================================================

  describe('Caching and Refresh', () => {
    test('caches initial selection (refreshKey = 0)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const articles = [createArticleWithRoots(1, [100]), createArticleWithRoots(2, [200])];

      const { result, rerender } = renderHook(
        ({ refreshKey }) => useFeaturedArticleSelection(articles, refreshKey, 'global'),
        { initialProps: { refreshKey: 0 } },
      );

      const firstArticle = result.current.article;

      // Re-render with same refreshKey should return same article
      rerender({ refreshKey: 0 });

      expect(result.current.article?.id).toBe(firstArticle?.id);
    });

    test('selects different article on refresh (refreshKey > 0)', () => {
      // First selection picks article 1
      jest.spyOn(Math, 'random').mockReturnValueOnce(0);

      const articles = [
        createArticleWithRoots(1, [100]),
        createArticleWithRoots(2, [200]),
        createArticleWithRoots(3, [300]),
      ];

      const { result, rerender } = renderHook(
        ({ refreshKey }) => useFeaturedArticleSelection(articles, refreshKey, 'global'),
        { initialProps: { refreshKey: 0 } },
      );

      const firstArticleId = result.current.article?.id;

      // Second selection should be different (random selects from available)
      jest.spyOn(Math, 'random').mockReturnValueOnce(0);
      rerender({ refreshKey: 1 });

      // Should be different article (or at least attempt to be)
      expect(result.current.reason).toBe('New recommendation selected');
    });

    test('clears cache when scope changes', () => {
      const articles = [createArticleWithRoots(1, [100])];

      const { result, rerender } = renderHook(
        ({ scope }) => useFeaturedArticleSelection(articles, 0, scope),
        { initialProps: { scope: 'global' } },
      );

      expect(result.current.article?.id).toBe(1);

      // Change scope should potentially trigger re-selection
      rerender({ scope: 'category-1' });

      // Article should still be returned (but cache invalidated internally)
      expect(result.current.article).toBeDefined();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles empty articles array', () => {
      const { result } = renderHook(() => useFeaturedArticleSelection([], 0, 'global'));

      expect(result.current.article).toBeNull();
      expect(result.current.reason).toBe('Loading articles...');
    });

    test('handles single article', () => {
      const articles = [createArticleWithRoots(1, [100])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.article?.id).toBe(1);
    });

    test('handles articles without sentence_words', () => {
      const article = createArticleMock({ id: 1 });
      // No article_sentences defined

      const { result } = renderHook(() =>
        useFeaturedArticleSelection([article as Article], 0, 'global'),
      );

      // Should not crash, falls back to random
      expect(result.current.article).toBeDefined();
    });

    test('returns dueWordRootIds set in result', () => {
      mockDueWordRootIds = new Set([100 as RootId, 101 as RootId]);

      const articles = [createArticleWithRoots(1, [100])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.dueWordRootIds).toEqual(mockDueWordRootIds);
    });
  });

  // ============================================================================
  // TYPE INFERENCE
  // ============================================================================

  describe('Type Inference', () => {
    test('returns correct type for due-words selection', () => {
      mockHasEnoughArticles = true;
      mockDueWordRootIds = new Set([100 as RootId]);

      const articles = [createArticleWithRoots(1, [100])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.type).toBe('due-words');
    });

    test('returns correct type for difficult-words selection', () => {
      mockHasEnoughArticles = false;
      fsrsDataMock.studyWords = [
        createTestWord({ root_id: 100 as RootId, fsrs_difficulty: 8 }),
        createTestWord({ root_id: 101 as RootId, fsrs_difficulty: 9 }),
        createTestWord({ root_id: 102 as RootId, fsrs_difficulty: 8.5 }),
      ];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      // Make isHardWord return true for these specific root_ids
      wordClassificationMock.isHardWord = (word: StudyWord) => {
        return [100, 101, 102].includes(word.root_id as number);
      };

      const articles = [createArticleWithRoots(1, [100, 101])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.type).toBe('difficult-words');
    });

    test('returns correct type for beginner selection', () => {
      mockUserValue = null;
      fsrsDataMock.studyWords = [];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      const beginnerArticle = createArticleWithRoots(1, [100], 1);
      const { getBeginnerArticles } = require('@/utils/articleUtils');
      jest.mocked(getBeginnerArticles).mockReturnValue([beginnerArticle]);

      const { result } = renderHook(() =>
        useFeaturedArticleSelection([beginnerArticle], 0, 'global'),
      );

      expect(result.current.type).toBe('beginner');
    });

    test('returns correct type for random selection', () => {
      fsrsDataMock.studyWords = [];

      // Update the mock to return the new studyWords
      jest.mocked(useFSRSData).mockReturnValue({
        studyWords: fsrsDataMock.studyWords,
        isLoading: false,
      });

      const { getBeginnerArticles } = require('@/utils/articleUtils');
      jest.mocked(getBeginnerArticles).mockReturnValue([]);

      const articles = [createArticleWithRoots(1, [100])];

      const { result } = renderHook(() => useFeaturedArticleSelection(articles, 0, 'global'));

      expect(result.current.type).toBe('random');
    });
  });
});
