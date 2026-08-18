/**
 * Hook Tests - useAudioPreloader
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

// expo-audio is mocked via moduleNameMapper → __mocks__/expo-audio.js

jest.mock('@/services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn(),
  },
}));

jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: jest.fn(
    (bucket: string, path: string) => `https://storage.example.com/${bucket}/${path}`,
  ),
}));

import { useAudioPreloader } from '@/hooks/review/useAudioPreloader';
import { audioCache } from '@/services/audioCache';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';
import { rootId, userId } from '@/__tests__/helpers/ids';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';

const mockAudioCache = jest.mocked(audioCache);

describe('useAudioPreloader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioCache.getAudio.mockResolvedValue('cached-path');
  });

  // The `roots` join is letters / meaning with NOT NULL audio columns, and the
  // FSRS fields are all `fsrs_`-prefixed — the previous literal matched neither.
  const createMockWord = (id: number, audioUrl = '', audioUrlEn = ''): StudyWord =>
    createTestWord({
      root_id: rootId(id),
      user_id: userId('user-123'),
      root: {
        id,
        letters: 'test',
        meaning: 'test',
        audio_url: audioUrl,
        audio_url_en: audioUrlEn,
      },
      fsrs_stability: 2.5,
      fsrs_difficulty: 0.3,
      fsrs_due: new Date().toISOString(),
      fsrs_last_review: new Date().toISOString(),
      fsrs_reps: 5,
      fsrs_lapses: 1,
      fsrs_state: 2,
      fsrs_scheduled_days: 7,
      created_at: new Date().toISOString(),
    });

  describe('Initial state', () => {
    test('should return initial state with empty word queue', () => {
      const { result } = renderHook(() => useAudioPreloader([], false));

      expect(result.current.isPreloading).toBeFalsy();
      expect(result.current.progress).toBe(0);
      expect(result.current.isReady).toBeFalsy();
    });

    test('should not crash with empty array', () => {
      const { result } = renderHook(() => useAudioPreloader([], false));
      expect(result.current).toBeDefined();
    });
  });

  describe('Return value structure', () => {
    test('should return all expected properties', () => {
      const { result } = renderHook(() => useAudioPreloader([], false));

      expect(result.current).toHaveProperty('isPreloading');
      expect(result.current).toHaveProperty('progress');
      expect(result.current).toHaveProperty('isReady');
    });

    test('should return boolean for isPreloading', () => {
      const { result } = renderHook(() => useAudioPreloader([], false));
      expect(typeof result.current.isPreloading).toBe('boolean');
    });

    test('should return number for progress', () => {
      const { result } = renderHook(() => useAudioPreloader([], false));
      expect(typeof result.current.progress).toBe('number');
    });
  });

  describe('Session complete behavior', () => {
    test('should not attempt preload when session is already complete', () => {
      const words = [createMockWord(1, 'audio1.mp3')];

      renderHook(() => useAudioPreloader(words, true));

      // Should not call getAudio when session is complete
      expect(mockAudioCache.getAudio).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', () => {
      const words = [createMockWord(1, 'audio1.mp3')];

      const { unmount } = renderHook(() => useAudioPreloader(words, false));

      // Should unmount without errors
      unmount();
    });
  });
});
