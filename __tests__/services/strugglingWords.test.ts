/**
 * Struggling Words Service Tests
 *
 * Tests the struggling words service which fetches and filters words
 * that the user is struggling with based on FSRS metrics.
 *
 * Focus: Filtering logic, parameter passing, limit handling
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ test.each() for parameterized tests
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/services/supabase', () => ({
  checkAuthentication: jest.fn(),
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(),
  },
}));

jest.mock('@/utils/wordClassification', () => ({
  isStrugglingWord: jest.fn(),
}));

// Import after mocks
import { strugglingWordsService } from '@/services/strugglingWords';
import { checkAuthentication } from '@/services/supabase';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { isStrugglingWord } from '@/utils/wordClassification';

const mockCheckAuthentication = jest.mocked(checkAuthentication);
const mockGetFSRSWords = jest.mocked(studyWordsFSRSService.getFSRSWords);
const mockIsStrugglingWord = jest.mocked(isStrugglingWord);

describe('strugglingWordsService', () => {
  const mockUser = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckAuthentication.mockResolvedValue(undefined);
  });

  describe('getStrugglingWords', () => {
    test('should check authentication before fetching words', async () => {
      mockGetFSRSWords.mockResolvedValue([]);
      mockIsStrugglingWord.mockReturnValue(false);

      await strugglingWordsService.getStrugglingWords(mockUser);

      expect(mockCheckAuthentication).toHaveBeenCalledWith(mockUser);
      expect(mockGetFSRSWords).toHaveBeenCalled();
    });

    test('should fetch reviewed words with correct parameters', async () => {
      mockGetFSRSWords.mockResolvedValue([]);
      mockIsStrugglingWord.mockReturnValue(false);

      await strugglingWordsService.getStrugglingWords(mockUser, 10, 2);

      expect(mockGetFSRSWords).toHaveBeenCalledWith(mockUser, {
        reviewedOnly: true,
        sortByDifficultyAndStability: true,
        sessionCooldownHours: 2,
      });
    });

    test('should use default parameters when not provided', async () => {
      mockGetFSRSWords.mockResolvedValue([]);
      mockIsStrugglingWord.mockReturnValue(false);

      await strugglingWordsService.getStrugglingWords(mockUser);

      expect(mockGetFSRSWords).toHaveBeenCalledWith(mockUser, {
        reviewedOnly: true,
        sortByDifficultyAndStability: true,
        sessionCooldownHours: 1, // default
      });
    });

    test('should filter words using isStrugglingWord', async () => {
      const mockWords = [
        { id: '1', word: 'word1', difficulty: 8, stability: 0.5 },
        { id: '2', word: 'word2', difficulty: 5, stability: 2 },
        { id: '3', word: 'word3', difficulty: 9, stability: 0.3 },
      ];
      mockGetFSRSWords.mockResolvedValue(mockWords);

      // Only word1 and word3 are struggling
      mockIsStrugglingWord.mockImplementation((word: any) => {
        return word.id === '1' || word.id === '3';
      });

      const result = await strugglingWordsService.getStrugglingWords(mockUser, 10);

      expect(mockIsStrugglingWord).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    test('should respect limit parameter', async () => {
      const mockWords = [
        { id: '1', word: 'word1', difficulty: 8, stability: 0.5 },
        { id: '2', word: 'word2', difficulty: 9, stability: 0.3 },
        { id: '3', word: 'word3', difficulty: 7, stability: 0.7 },
        { id: '4', word: 'word4', difficulty: 10, stability: 0.2 },
      ];
      mockGetFSRSWords.mockResolvedValue(mockWords);
      mockIsStrugglingWord.mockReturnValue(true); // All are struggling

      const result = await strugglingWordsService.getStrugglingWords(mockUser, 2);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    // Parameterized tests for empty array scenarios
    test.each([
      {
        name: 'no struggling words',
        mockWords: [
          { id: '1', word: 'word1', difficulty: 3, stability: 5 },
          { id: '2', word: 'word2', difficulty: 2, stability: 10 },
        ],
        isStrugglingReturnValue: false,
        expectedLength: 0,
        shouldCallIsStrugglingWord: true,
      },
      {
        name: 'no candidate words',
        mockWords: [],
        isStrugglingReturnValue: true,
        expectedLength: 0,
        shouldCallIsStrugglingWord: false,
      },
      {
        name: 'limit larger than available',
        mockWords: [
          { id: '1', word: 'word1', difficulty: 8, stability: 0.5 },
          { id: '2', word: 'word2', difficulty: 9, stability: 0.3 },
        ],
        isStrugglingReturnValue: true,
        expectedLength: 2,
        shouldCallIsStrugglingWord: true,
        limit: 100,
      },
    ])(
      'should handle $name correctly',
      async ({
        mockWords,
        isStrugglingReturnValue,
        expectedLength,
        shouldCallIsStrugglingWord,
        limit,
      }) => {
        mockGetFSRSWords.mockResolvedValue(mockWords);
        mockIsStrugglingWord.mockReturnValue(isStrugglingReturnValue);

        const result = await strugglingWordsService.getStrugglingWords(mockUser, limit);

        expect(result).toHaveLength(expectedLength);
        if (!shouldCallIsStrugglingWord) {
          expect(mockIsStrugglingWord).not.toHaveBeenCalled();
        }
      },
    );

    test('should throw if authentication fails', async () => {
      const authError = new Error('Unauthenticated');
      mockCheckAuthentication.mockRejectedValue(authError);

      await expect(strugglingWordsService.getStrugglingWords(mockUser)).rejects.toThrow(
        'Unauthenticated',
      );

      expect(mockGetFSRSWords).not.toHaveBeenCalled();
    });
  });
});
