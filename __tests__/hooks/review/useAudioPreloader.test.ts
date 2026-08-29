/**
 * Hook Tests - useAudioPreloader
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, jest, beforeEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { clearAllPreloadedSources, clearPreloadedSource, preload } from 'expo-audio';

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
import { generateStorageUrl } from '@/utils/storageUtils';
import { rootId, userId } from '@/__tests__/helpers/ids';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';

const mockAudioCache = jest.mocked(audioCache);
const mockPreload = jest.mocked(preload);
const mockClearPreloadedSource = jest.mocked(clearPreloadedSource);
const mockClearAllPreloadedSources = jest.mocked(clearAllPreloadedSources);
const mockGenerateStorageUrl = jest.mocked(generateStorageUrl);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useAudioPreloader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudioCache.getAudio.mockResolvedValue('cached-path');
    mockPreload.mockResolvedValue(undefined);
    mockGenerateStorageUrl.mockImplementation(
      (bucket, path) => `https://storage.example.com/${bucket}/${path ?? ''}`,
    );
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

  describe('Cache and native preload behavior', () => {
    test('does not preload or expose a failed remote cache fallback', async () => {
      const word = createMockWord(1, 'audio1.mp3');
      const remoteUrl = 'https://storage.example.com/audio/audio1.mp3';
      mockAudioCache.getAudio.mockResolvedValue(remoteUrl);

      const { result } = renderHook(() => useAudioPreloader([word], false));

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(mockPreload).not.toHaveBeenCalled();
      expect(result.current.resolveCached(remoteUrl)).toBeUndefined();
    });

    test('treats an invalid undefined cache result as a miss', async () => {
      const word = createMockWord(1, 'audio1.mp3');
      const remoteUrl = 'https://storage.example.com/audio/audio1.mp3';
      mockAudioCache.getAudio.mockResolvedValueOnce(
        undefined as unknown as Awaited<ReturnType<typeof audioCache.getAudio>>,
      );

      const { result } = renderHook(() => useAudioPreloader([word], false));

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(mockPreload).not.toHaveBeenCalled();
      expect(result.current.resolveCached(remoteUrl)).toBeUndefined();
    });

    test('stores and preloads a valid local cache path', async () => {
      const word = createMockWord(1, 'audio1.mp3');
      const remoteUrl = 'https://storage.example.com/audio/audio1.mp3';
      mockAudioCache.getAudio.mockResolvedValue('/cache/audio1.mp3');

      const { result } = renderHook(() => useAudioPreloader([word], false));

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(mockPreload).toHaveBeenCalledWith('/cache/audio1.mp3');
      expect(result.current.resolveCached(remoteUrl)).toBe('/cache/audio1.mp3');

      act(() => result.current.forgetCached(remoteUrl));
      expect(result.current.resolveCached(remoteUrl)).toBeUndefined();
    });
  });

  describe('Progress isolation', () => {
    test('reports progress only for the first card blocking files', async () => {
      const arabic = deferred<string>();
      const english = deferred<string>();
      mockAudioCache.getAudio.mockImplementation(url => {
        if (url.endsWith('audio1.mp3')) return arabic.promise;
        return english.promise;
      });

      const { result } = renderHook(() =>
        useAudioPreloader([createMockWord(1, 'audio1.mp3', 'audio1-en.mp3')], false),
      );

      await waitFor(() => expect(mockAudioCache.getAudio).toHaveBeenCalledTimes(2));
      expect(result.current.isPreloading).toBe(true);

      await act(async () => arabic.resolve('/cache/audio1.mp3'));
      await waitFor(() => expect(result.current.progress).toBe(50));

      await act(async () => english.resolve('/cache/audio1-en.mp3'));
      await waitFor(() => expect(result.current.isReady).toBe(true));
      expect(result.current.progress).toBe(100);
    });

    test('does not publish progress or rerender when background files finish', async () => {
      const background = deferred<string>();
      mockAudioCache.getAudio.mockImplementation(url => {
        if (url.endsWith('audio2.mp3')) return background.promise;
        return Promise.resolve('/cache/audio1.mp3');
      });

      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useAudioPreloader(
          [createMockWord(1, 'audio1.mp3'), createMockWord(2, 'audio2.mp3')],
          false,
        );
      });

      await waitFor(() => expect(result.current.isReady).toBe(true));
      await waitFor(() => expect(mockAudioCache.getAudio).toHaveBeenCalledTimes(2));
      expect(result.current.progress).toBe(100);
      const rendersAfterSessionReady = renderCount;

      await act(async () => background.resolve('/cache/audio2.mp3'));
      await waitFor(() => expect(mockPreload).toHaveBeenCalledWith('/cache/audio2.mp3'));

      expect(result.current.progress).toBe(100);
      expect(renderCount).toBe(rendersAfterSessionReady);
    });

    test('does not publish late first-card progress after the loading deadline', async () => {
      jest.useFakeTimers();
      const audio = deferred<string>();
      mockAudioCache.getAudio.mockReturnValue(audio.promise);

      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useAudioPreloader([createMockWord(1, 'audio1.mp3')], false);
      });

      try {
        expect(result.current.isPreloading).toBe(true);
        await act(async () => jest.advanceTimersByTimeAsync(10_000));
        expect(result.current.isReady).toBe(true);
        expect(result.current.progress).toBe(0);
        const rendersAfterDeadline = renderCount;

        await act(async () => audio.resolve('/cache/audio1.mp3'));

        expect(result.current.progress).toBe(0);
        expect(renderCount).toBe(rendersAfterDeadline);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('Cancellation', () => {
    test('does not enter native preload when a cache lookup finishes after unmount', async () => {
      const audio = deferred<string>();
      mockAudioCache.getAudio.mockReturnValue(audio.promise);

      const { unmount } = renderHook(() =>
        useAudioPreloader([createMockWord(1, 'audio1.mp3')], false),
      );
      await waitFor(() => expect(mockAudioCache.getAudio).toHaveBeenCalledTimes(1));

      unmount();
      await act(async () => audio.resolve('/cache/audio1.mp3'));

      expect(mockPreload).not.toHaveBeenCalled();
    });

    test('releases only review-owned native buffers when unmounted', async () => {
      const { result, unmount } = renderHook(() =>
        useAudioPreloader([createMockWord(1, 'audio1.mp3')], false),
      );
      await waitFor(() => expect(result.current.isReady).toBe(true));

      unmount();

      expect(mockClearPreloadedSource).toHaveBeenCalledWith('cached-path');
      expect(mockClearAllPreloadedSources).not.toHaveBeenCalled();
    });

    test('does not start another background batch after unmount', async () => {
      jest.useFakeTimers();
      const background = Array.from({ length: 6 }, () => deferred<string>());
      let backgroundIndex = 0;
      mockAudioCache.getAudio.mockImplementation(url => {
        if (url.endsWith('audio1.mp3')) return Promise.resolve('/cache/audio1.mp3');
        return background[backgroundIndex++]!.promise;
      });

      const words = Array.from({ length: 7 }, (_, index) =>
        createMockWord(index + 1, `audio${index + 1}.mp3`),
      );
      const { result, unmount } = renderHook(() => useAudioPreloader(words, false));

      try {
        await act(async () => Promise.resolve());
        expect(result.current.isReady).toBe(true);
        // First-card audio plus the first five-file background batch.
        expect(mockAudioCache.getAudio).toHaveBeenCalledTimes(6);

        unmount();
        await act(async () => {
          background
            .slice(0, 5)
            .forEach((item, index) => item.resolve(`/cache/audio${index + 2}.mp3`));
          await Promise.resolve();
          await jest.advanceTimersByTimeAsync(100);
        });

        expect(mockAudioCache.getAudio).toHaveBeenCalledTimes(6);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
