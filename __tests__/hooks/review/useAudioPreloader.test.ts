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

const mockAudioCache = jest.mocked(audioCache);

describe('useAudioPreloader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioCache.getAudio.mockResolvedValue('cached-path');
  });

  const createMockWord = (rootId: number, audioUrl?: string, audioUrlEn?: string): StudyWord => ({
    id: rootId,
    root_id: rootId as RootId,
    user_id: 'user-123' as UserId,
    root: {
      id: rootId as RootId,
      arabic_word: 'test',
      english_meaning: 'test',
      audio_url: audioUrl,
      audio_url_en: audioUrlEn,
    },
    stability: 2.5,
    difficulty: 0.3,
    due: new Date().toISOString(),
    last_review: new Date().toISOString(),
    reps: 5,
    lapses: 1,
    state: 2,
    elapsed_days: 3,
    scheduled_days: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  describe('Initial state', () => {
    test('should return initial state with empty word queue', () => {
      const { result } = renderHook(() => useAudioPreloader([], false));

      expect(result.current.isPreloading).toBeFalsy();
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBeFalsy();
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
      expect(result.current).toHaveProperty('isComplete');
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
