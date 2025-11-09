import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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
import { generateAudioUrl, generateImageUrl } from '@/utils/imageUtils';

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

jest.mock('@/utils/imageUtils', () => ({
  generateAudioUrl: jest.fn(),
  generateImageUrl: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

const simpleAudioServiceMock = simpleAudioService as jest.Mocked<typeof simpleAudioService>;
const audioCacheMock = audioCache as jest.Mocked<typeof audioCache>;
const generateAudioUrlMock = generateAudioUrl as jest.MockedFunction<typeof generateAudioUrl>;
const generateImageUrlMock = generateImageUrl as jest.MockedFunction<typeof generateImageUrl>;

describe('audioUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentArticleId', () => {
    it('should return article ID when a track is playing', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: { articleId: 123 } as any,
        isPlaying: true,
        isLoading: false,
        currentTime: 0,
        duration: 100,
      });

      const result = getCurrentArticleId();

      expect(result).toBe(123);
    });

    it('should return undefined when no track is playing', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
      });

      const result = getCurrentArticleId();

      expect(result).toBeUndefined();
    });

    it('should parse string article IDs to numbers', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: { articleId: '456' as any },
        isPlaying: true,
        isLoading: false,
        currentTime: 0,
        duration: 100,
      });

      const result = getCurrentArticleId();

      expect(result).toBe(456);
    });
  });

  describe('isAudioBusy', () => {
    it('should return true when audio is loading', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        isLoading: true,
        currentTime: 0,
        duration: 0,
      });

      expect(isAudioBusy()).toBe(true);
    });

    it('should return false when audio is not loading', () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
      });

      expect(isAudioBusy()).toBe(false);
    });
  });

  describe('stopAudioSafely', () => {
    it('should stop audio when playing', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        isPlaying: true,
        isLoading: false,
        currentTime: 10,
        duration: 100,
      });
      simpleAudioServiceMock.stop.mockResolvedValue(undefined);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    it('should stop audio when loading', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        isLoading: true,
        currentTime: 0,
        duration: 0,
      });
      simpleAudioServiceMock.stop.mockResolvedValue(undefined);

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).toHaveBeenCalled();
    });

    it('should not stop audio when not playing or loading', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
      });

      await stopAudioSafely();

      expect(simpleAudioServiceMock.stop).not.toHaveBeenCalled();
    });

    it('should silently catch errors by default', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        isPlaying: true,
        isLoading: false,
        currentTime: 10,
        duration: 100,
      });
      simpleAudioServiceMock.stop.mockRejectedValue(new Error('Stop failed'));

      await expect(stopAudioSafely()).resolves.toBeUndefined();
    });

    it('should throw errors when throwOnError is true', async () => {
      simpleAudioServiceMock.getStatus.mockReturnValue({
        currentTrack: {} as any,
        isPlaying: true,
        isLoading: false,
        currentTime: 10,
        duration: 100,
      });
      simpleAudioServiceMock.stop.mockRejectedValue(new Error('Stop failed'));

      await expect(stopAudioSafely(true)).rejects.toThrow('Stop failed');
    });
  });

  describe('generateWordAudioTrack', () => {
    it('should generate track with Arabic audio URL and use cache', async () => {
      const word: WordAudioData = {
        id: 1,
        audio_url: 'arabic.mp3',
        audio_url_en: null,
        letters: 'كتاب',
        meaning: 'book',
      };

      const remoteUrl = 'https://example.com/arabic.mp3';
      const cachedUrl = 'file:///cache/arabic.mp3';

      generateAudioUrlMock.mockReturnValueOnce(remoteUrl);
      audioCacheMock.getAudio.mockResolvedValueOnce(cachedUrl);

      const result = await generateWordAudioTrack(word);

      expect(audioCacheMock.getAudio).toHaveBeenCalledWith(remoteUrl);
      expect(result).toEqual({
        id: 'word-1-ar',
        audioUrl: cachedUrl,
        title: 'كتاب',
      });
    });

    it('should return null when no audio URL is available', async () => {
      const word: WordAudioData = {
        id: 3,
        audio_url: null,
        audio_url_en: null,
      };

      generateAudioUrlMock.mockReturnValue(undefined);

      const result = await generateWordAudioTrack(word);

      expect(result).toBeNull();
      expect(audioCacheMock.getAudio).not.toHaveBeenCalled();
    });

    it('should use custom track ID prefix', async () => {
      const word: WordAudioData = {
        id: 4,
        audio_url: 'test.mp3',
        letters: 'test',
      };

      const remoteUrl = 'https://example.com/test.mp3';
      const cachedUrl = 'file:///cache/test.mp3';

      generateAudioUrlMock.mockReturnValue(remoteUrl);
      audioCacheMock.getAudio.mockResolvedValueOnce(cachedUrl);

      const result = await generateWordAudioTrack(word, 'custom');

      expect(result?.id).toBe('custom-4-ar');
    });

    it('should prioritize title fields: letters > meaning > english > word_form', async () => {
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

      generateAudioUrlMock.mockReturnValue('https://example.com/test.mp3');
      audioCacheMock.getAudio.mockResolvedValue(cachedUrl);

      expect((await generateWordAudioTrack(word1))?.title).toBe('A');
      expect((await generateWordAudioTrack(word2))?.title).toBe('B');
      expect((await generateWordAudioTrack(word3))?.title).toBe('C');
      expect((await generateWordAudioTrack(word4))?.title).toBe('D');
    });

    it('should use fallback title when no title fields exist', async () => {
      const word: WordAudioData = {
        id: 5,
        audio_url: 'test.mp3',
      };

      const remoteUrl = 'https://example.com/test.mp3';
      const cachedUrl = 'file:///cache/test.mp3';

      generateAudioUrlMock.mockReturnValue(remoteUrl);
      audioCacheMock.getAudio.mockResolvedValueOnce(cachedUrl);

      const result = await generateWordAudioTrack(word);

      expect(result?.title).toBe('Arabic Pronunciation');
    });
  });

  describe('prefetchArticleWithImage', () => {
    it('should prefetch article data and image when available', async () => {
      const mockQueryClient = {
        prefetchQuery: jest.fn().mockResolvedValue(undefined),
        getQueryData: jest.fn().mockReturnValue({
          id: 1,
          image_url: 'test.jpg',
        }),
      } as any;

      const { Image } = require('expo-image');
      Image.prefetch.mockResolvedValue(true);
      generateImageUrlMock.mockReturnValue('https://example.com/test.jpg');

      await prefetchArticleWithImage(1, mockQueryClient);

      expect(mockQueryClient.prefetchQuery).toHaveBeenCalled();
      expect(Image.prefetch).toHaveBeenCalledWith('https://example.com/test.jpg', {
        cachePolicy: 'memory-disk',
      });
    });

    it('should handle missing image URL gracefully', async () => {
      const mockQueryClient = {
        prefetchQuery: jest.fn().mockResolvedValue(undefined),
        getQueryData: jest.fn().mockReturnValue(null),
      } as any;

      const mockPrefetchArticle = jest.fn().mockResolvedValue(true);
      generateImageUrlMock.mockReturnValue(null);

      await prefetchArticleWithImage(1, mockQueryClient, mockPrefetchArticle);

      expect(mockPrefetchArticle).toHaveBeenCalledWith(1);
    });

    it('should silently handle prefetch failures', async () => {
      const mockQueryClient = {
        prefetchQuery: jest.fn().mockRejectedValue(new Error('Prefetch failed')),
        getQueryData: jest.fn().mockReturnValue(null),
      } as any;

      await expect(prefetchArticleWithImage(1, mockQueryClient)).resolves.toBeUndefined();
    });
  });
});
