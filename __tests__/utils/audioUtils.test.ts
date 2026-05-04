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

import { audioCache } from '@/services/audioCache';
import { simpleAudioService } from '@/services/audioPlayer';
import {
  generateWordAudioTrack,
  getCurrentArticleId,
  isAudioBusy,
  prefetchArticleWithImage,
  stopAudioSafely,
  type WordAudioData,
} from '@/utils/audioUtils';
import { generateStorageUrl } from '@/utils/storageUtils';

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

  describe('getCurrentArticleId', () => {
    test('should return article ID when a track is playing', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: { articleId: 123 } as any,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        currentTime: 0,
        duration: 100,
      });

      const result = getCurrentArticleId();

      expect(result).toBe(123);
    });

    test('should return undefined when no track is playing', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
      });

      const result = getCurrentArticleId();

      expect(result).toBeUndefined();
    });

    test('should parse string article IDs to numbers', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: { articleId: '456' as any },
        playing: true,
        isLoaded: true,
        isBuffering: false,
        currentTime: 0,
        duration: 100,
      });

      const result = getCurrentArticleId();

      expect(result).toBe(456);
    });
  });

  describe('isAudioBusy', () => {
    test('should return true when a track is buffering', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        playing: false,
        isLoaded: false,
        isBuffering: true,
        currentTime: 0,
        duration: 0,
      });

      expect(isAudioBusy()).toBeTruthy();
    });

    test('should return false when a track is fully loaded', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
      });

      expect(isAudioBusy()).toBeFalsy();
    });

    test('should return false in the initial idle state (no track loaded)', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        playing: false,
        isLoaded: false,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
      });

      expect(isAudioBusy()).toBeFalsy();
    });
  });

  describe('stopAudioSafely', () => {
    test('should stop audio when playing', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        currentTime: 10,
        duration: 100,
      });
      simpleAudioServiceMock.stop.mockResolvedValue(undefined);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    test('should stop audio when loading', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        playing: false,
        isLoaded: false,
        isBuffering: true,
        currentTime: 0,
        duration: 0,
      });
      simpleAudioServiceMock.stop.mockResolvedValue(undefined);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    test('should not stop audio when not playing or loading', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
      });

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).not.toHaveBeenCalled();
    });

    test('should silently catch errors by default', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        currentTime: 10,
        duration: 100,
      });
      simpleAudioServiceMock.stop.mockRejectedValue(new Error('Stop failed'));

      await expect(stopAudioSafely()).resolves.toBeUndefined();
    });

    test('should throw errors when throwOnError is true', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        currentTime: 10,
        duration: 100,
      });
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
      expect(audioCacheMock.getAudio).toHaveBeenCalledWith(remoteUrl);
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
    test('should prefetch article data and image when available', async () => {
      const mockQueryClient = {
        prefetchQuery: jest.fn().mockResolvedValue(undefined),
        getQueryData: jest.fn().mockReturnValue({
          id: 1,
          image_url: 'test.jpg',
        }),
      } as any;

      const { Image } = require('expo-image');
      Image.prefetch.mockResolvedValue(true);
      generateStorageUrlMock.mockReturnValue('https://example.com/test.jpg');

      await prefetchArticleWithImage(1, mockQueryClient);

      expect(mockQueryClient.prefetchQuery).toHaveBeenCalled();
      expect(Image.prefetch).toHaveBeenCalledWith('https://example.com/test.jpg', {
        cachePolicy: 'memory-disk',
      });
    });

    test('should handle missing image URL gracefully', async () => {
      const mockQueryClient = {
        prefetchQuery: jest.fn().mockResolvedValue(undefined),
        getQueryData: jest.fn().mockReturnValue(null),
      } as any;

      const mockPrefetchArticle = jest.fn().mockResolvedValue(true);
      generateStorageUrlMock.mockReturnValue('');

      await prefetchArticleWithImage(1, mockQueryClient, mockPrefetchArticle);

      expect(mockPrefetchArticle).toHaveBeenCalledWith(1);
    });

    test('should silently handle prefetch failures', async () => {
      const mockQueryClient = {
        prefetchQuery: jest.fn().mockRejectedValue(new Error('Prefetch failed')),
        getQueryData: jest.fn().mockReturnValue(null),
      } as any;

      await expect(prefetchArticleWithImage(1, mockQueryClient)).resolves.toBeUndefined();
    });
  });
});
