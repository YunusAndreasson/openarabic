/**
 * Audio Utils Tests
 *
 * Tests audio utility functions for playback, caching, and prefetching.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - tests share mock state and need isolation
 */

import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import type { QueryClient } from '@tanstack/react-query';

import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import {
  generateWordAudioTrack,
  isAudioBusy,
  prefetchArticleWithImage,
  stopAudioSafely,
  type WordAudioData,
} from '@/utils/audioUtils';
import { generateStorageUrl } from '@/utils/storageUtils';
import { articleId } from '@/__tests__/helpers/ids';
import {
  createAudioStatusMock,
  createEnhancedAudioTrackMock,
} from '@/__tests__/helpers/serviceMocks';

// Mock dependencies
jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    getStatus: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn(),
  },
}));

jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

const simpleAudioServiceMock = jest.mocked(simpleAudioService);
const audioCacheMock = jest.mocked(audioCache);
const generateStorageUrlMock = jest.mocked(generateStorageUrl);

describe('audioUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAudioBusy', () => {
    test('should return true when a track is buffering', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: {} as any,
          playing: false,
          isLoaded: false,
          isBuffering: true,
          currentTime: 0,
          duration: 0,
        }),
      );

      expect(isAudioBusy()).toBeTruthy();
    });

    test('should return false when a track is fully loaded', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: {} as any,
          playing: false,
          isLoaded: true,
          isBuffering: false,
          currentTime: 0,
          duration: 0,
        }),
      );

      expect(isAudioBusy()).toBeFalsy();
    });

    test('should return false in the initial idle state (no track loaded)', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: null,
          playing: false,
          isLoaded: false,
          isBuffering: false,
          currentTime: 0,
          duration: 0,
        }),
      );

      expect(isAudioBusy()).toBeFalsy();
    });
  });

  describe('stopAudioSafely', () => {
    test('should stop audio when playing', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: {} as any,
          playing: true,
          isLoaded: true,
          isBuffering: false,
          currentTime: 10,
          duration: 100,
        }),
      );
      simpleAudioServiceMock.stop.mockResolvedValue(true);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    test('should stop audio when loading', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: null,
          playing: false,
          isLoaded: false,
          isBuffering: true,
          currentTime: 0,
          duration: 0,
        }),
      );
      simpleAudioServiceMock.stop.mockResolvedValue(true);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    test('should not stop a loaded track that is holding still', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: createEnhancedAudioTrackMock(),
          playing: false,
          isLoaded: true,
          isBuffering: false,
          currentTime: 0,
          duration: 0,
        }),
      );

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).not.toHaveBeenCalled();
    });

    test('should stop when idle, superseding a play that has not published its track', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(createAudioStatusMock());
      simpleAudioServiceMock.stop.mockResolvedValue(true);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    test('should silently catch errors by default', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: {} as any,
          playing: true,
          isLoaded: true,
          isBuffering: false,
          currentTime: 10,
          duration: 100,
        }),
      );
      simpleAudioServiceMock.stop.mockRejectedValue(new Error('Stop failed'));

      await expect(stopAudioSafely()).resolves.toBeUndefined();
    });

    test('should throw errors when throwOnError is true', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue(
        createAudioStatusMock({
          currentTrack: {} as any,
          playing: true,
          isLoaded: true,
          isBuffering: false,
          currentTime: 10,
          duration: 100,
        }),
      );
      simpleAudioServiceMock.stop.mockRejectedValue(new Error('Stop failed'));

      await expect(stopAudioSafely(true)).rejects.toThrow('Stop failed');
    });
  });

  describe('generateWordAudioTrack', () => {
    test('should generate track with Arabic audio URL and use cache', async () => {
      const word: WordAudioData = {
        id: 1,
        audio_url: 'arabic.mp3',
        audio_url_en: null,
        letters: 'كتاب',
        meaning: 'book',
      };

      const remoteUrl = 'https://example.com/arabic.mp3';
      const cachedUrl = 'file:///cache/arabic.mp3';

      generateStorageUrlMock.mockReturnValueOnce(remoteUrl);
      audioCacheMock.getAudio.mockResolvedValueOnce(cachedUrl);

      const result = await generateWordAudioTrack(word);

      expect(generateStorageUrlMock).toHaveBeenCalledWith('audio', 'arabic.mp3');
      expect(audioCacheMock.getAudio).toHaveBeenCalledWith(remoteUrl, { quick: true });
      expect(result).toEqual({
        id: 'word-1-ar',
        audioUrl: cachedUrl,
        title: 'كتاب',
      });
    });

    test('should return null when no audio URL is available', async () => {
      const word: WordAudioData = {
        id: 3,
        audio_url: null,
        audio_url_en: null,
      };

      generateStorageUrlMock.mockReturnValue('');

      const result = await generateWordAudioTrack(word);

      expect(result).toBeNull();
      expect(audioCacheMock.getAudio).not.toHaveBeenCalled();
    });

    test('should use custom track ID prefix', async () => {
      const word: WordAudioData = {
        id: 4,
        audio_url: 'test.mp3',
        letters: 'test',
      };

      const remoteUrl = 'https://example.com/test.mp3';
      const cachedUrl = 'file:///cache/test.mp3';

      generateStorageUrlMock.mockReturnValue(remoteUrl);
      audioCacheMock.getAudio.mockResolvedValueOnce(cachedUrl);

      const result = await generateWordAudioTrack(word, 'custom');

      expect(result?.id).toBe('custom-4-ar');
    });

    test('should prioritize title fields: letters > meaning > english > word_form', async () => {
      const word1: WordAudioData = {
        id: 1,
        audio_url: 'a.mp3',
        letters: 'A',
        meaning: 'B',
        english: 'C',
      };
      const word2: WordAudioData = { id: 2, audio_url: 'a.mp3', meaning: 'B', english: 'C' };
      const word3: WordAudioData = { id: 3, audio_url: 'a.mp3', english: 'C', word_form: 'D' };
      const word4: WordAudioData = { id: 4, audio_url: 'a.mp3', word_form: 'D' };

      const cachedUrl = 'file:///cache/test.mp3';

      generateStorageUrlMock.mockReturnValue('https://example.com/test.mp3');
      audioCacheMock.getAudio.mockResolvedValue(cachedUrl);

      expect((await generateWordAudioTrack(word1))?.title).toBe('A');
      expect((await generateWordAudioTrack(word2))?.title).toBe('B');
      expect((await generateWordAudioTrack(word3))?.title).toBe('C');
      expect((await generateWordAudioTrack(word4))?.title).toBe('D');
    });

    test('should use fallback title when no title fields exist', async () => {
      const word: WordAudioData = {
        id: 5,
        audio_url: 'test.mp3',
      };

      const remoteUrl = 'https://example.com/test.mp3';
      const cachedUrl = 'file:///cache/test.mp3';

      generateStorageUrlMock.mockReturnValue(remoteUrl);
      audioCacheMock.getAudio.mockResolvedValueOnce(cachedUrl);

      const result = await generateWordAudioTrack(word);

      expect(result?.title).toBe('Arabic Pronunciation');
    });
  });

  describe('prefetchArticleWithImage', () => {
    const createQueryClientMock = (query: () => Promise<unknown>) =>
      ({ query: jest.fn(query) }) as unknown as QueryClient;

    test("prefetches the track's article and its artwork, whether or not it is cached", () => {
      const queryClient = createQueryClientMock(async () => undefined);
      const { Image } = require('expo-image');
      Image.prefetch.mockResolvedValue(true);

      prefetchArticleWithImage(
        createEnhancedAudioTrackMock({
          articleId: articleId(1),
          imageUrl: 'https://example.com/test.jpg',
        }),
        queryClient,
      );

      expect(queryClient.query).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['article', 1] }),
      );
      // Straight from the track: reading it off the cached article only ever
      // prefetched artwork that was already cached.
      expect(Image.prefetch).toHaveBeenCalledWith('https://example.com/test.jpg', {
        cachePolicy: 'memory-disk',
      });
    });

    test('skips the artwork when the track has none', () => {
      const queryClient = createQueryClientMock(async () => undefined);
      const { Image } = require('expo-image');

      prefetchArticleWithImage(
        createEnhancedAudioTrackMock({ articleId: articleId(1), imageUrl: undefined }),
        queryClient,
      );

      expect(Image.prefetch).not.toHaveBeenCalled();
    });

    test('should silently handle prefetch failures', async () => {
      const queryClient = createQueryClientMock(async () => {
        throw new Error('Prefetch failed');
      });
      const { Image } = require('expo-image');
      Image.prefetch.mockRejectedValue(new Error('Image failed'));

      expect(() =>
        prefetchArticleWithImage(
          createEnhancedAudioTrackMock({ articleId: articleId(1), imageUrl: 'x.jpg' }),
          queryClient,
        ),
      ).not.toThrow();
      // Neither rejection escapes as an unhandled one.
      await new Promise(resolve => setImmediate(resolve));
    });
  });
});
