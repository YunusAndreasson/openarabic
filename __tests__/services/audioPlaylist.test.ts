/**
 * Audio Playlist Service Tests
 *
 * Tests the enhanced audio service which handles audio playback with caching.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock expo-file-system before any imports that use it
jest.mock('expo-file-system', () => ({
  Paths: {
    cache: { uri: '/mock-cache/' },
    document: { uri: '/mock-document/' },
  },
  Directory: jest.fn(),
  File: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (..._args: unknown[]) => 'mock-hash'),
}));

jest.mock('../../services/articles');
jest.mock('../../services/audioCache');
jest.mock('../../services/bookmark', () => ({
  bookmarkService: {
    getReadingList: jest.fn(async (..._args: unknown[]) => []),
    addToReadingList: jest.fn(async (..._args: unknown[]) => undefined),
    removeFromReadingList: jest.fn(async (..._args: unknown[]) => undefined),
  },
}));
// readingList service no longer exists, mocking readingProgress instead
jest.mock('../../services/readingProgress', () => ({
  getReadingProgress: jest.fn(async (..._args: unknown[]) => []),
  updateReadingProgress: jest.fn(async (..._args: unknown[]) => undefined),
}));
jest.mock('@/utils/errorHandling');
jest.mock('@/utils/storageUtils');

import { STRINGS } from '@/constants/strings';
import { enhancedAudioService, warmTrackCache } from '@/services/audioPlaylist';
import { handleError } from '@/utils/errorHandling';
import { generateStorageUrl } from '@/utils/storageUtils';

import { articlesService } from '../../services/articles';
import { audioCache } from '../../services/audioCache';
import { bookmarkService } from '../../services/bookmark';
import { articleId } from '@/__tests__/helpers/ids';

const mockArticlesService = jest.mocked(articlesService);
const mockAudioCache = jest.mocked(audioCache);
const mockBookmarkService = jest.mocked(bookmarkService);
const mockHandleError = jest.mocked(handleError);
const mockGenerateStorageUrl = jest.mocked(generateStorageUrl);

describe('enhancedAudioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEnhancedAudioTrack', () => {
    const mockArticle = {
      id: 1,
      title: 'Test Article',
      audio_url: 'test-audio.mp3',
      audio_url_bilingual: 'test-bilingual.mp3',
      image_url: 'test-image.jpg',
    };

    test('generates bilingual track when preference is bilingual and bilingual URL exists', async () => {
      mockArticlesService.getArticleById.mockResolvedValue(mockArticle as any);
      mockGenerateStorageUrl.mockImplementation((bucket, path) => {
        if (bucket === 'audio') return 'https://example.com/test-bilingual.mp3';
        if (bucket === 'images') return 'https://example.com/test-image.jpg';
        return '';
      });
      mockAudioCache.getCachedPath.mockResolvedValue('cached-bilingual.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId(1),
        'bilingual',
      );

      expect(result).toEqual({
        id: 'article-1',
        articleId: 1,
        audioUrl: 'cached-bilingual.mp3',
        sourceUrl: 'https://example.com/test-bilingual.mp3',
        title: 'Test Article',
        imageUrl: 'https://example.com/test-image.jpg',
      });
      expect(mockGenerateStorageUrl).toHaveBeenCalledWith('audio', 'test-bilingual.mp3');
    });

    test('falls back to arabic audio when bilingual preference but no bilingual URL', async () => {
      const articleWithoutBilingual = { ...mockArticle, audio_url_bilingual: null };
      mockArticlesService.getArticleById.mockResolvedValue(articleWithoutBilingual as any);
      mockGenerateStorageUrl.mockImplementation((bucket, _path) => {
        if (bucket === 'audio') return 'https://example.com/test-audio.mp3';
        if (bucket === 'images') return 'https://example.com/test-image.jpg';
        return '';
      });
      mockAudioCache.getCachedPath.mockResolvedValue('cached-arabic.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId(1),
        'bilingual',
      );

      expect(result).toEqual({
        id: 'article-1',
        articleId: 1,
        audioUrl: 'cached-arabic.mp3',
        sourceUrl: 'https://example.com/test-audio.mp3',
        title: 'Test Article',
        imageUrl: 'https://example.com/test-image.jpg',
      });
      expect(mockGenerateStorageUrl).toHaveBeenCalledWith('audio', 'test-audio.mp3');
    });

    test('uses arabic audio when preference is arabic', async () => {
      mockArticlesService.getArticleById.mockResolvedValue(mockArticle as any);
      mockGenerateStorageUrl.mockImplementation((bucket, _path) => {
        if (bucket === 'audio') return 'https://example.com/test-audio.mp3';
        if (bucket === 'images') return 'https://example.com/test-image.jpg';
        return '';
      });
      mockAudioCache.getCachedPath.mockResolvedValue('cached-arabic.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(articleId(1), 'arabic');

      expect(result).toEqual({
        id: 'article-1',
        articleId: 1,
        audioUrl: 'cached-arabic.mp3',
        sourceUrl: 'https://example.com/test-audio.mp3',
        title: 'Test Article',
        imageUrl: 'https://example.com/test-image.jpg',
      });
      expect(mockGenerateStorageUrl).toHaveBeenCalledWith('audio', 'test-audio.mp3');
    });

    test('streams the remote URL when the file is not cached, without downloading first', async () => {
      mockArticlesService.getArticleById.mockResolvedValue(mockArticle as any);
      mockGenerateStorageUrl.mockImplementation(bucket => {
        if (bucket === 'audio') return 'https://example.com/test-bilingual.mp3';
        if (bucket === 'images') return 'https://example.com/test-image.jpg';
        return '';
      });
      mockAudioCache.getCachedPath.mockResolvedValue(null);

      const result = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId(1),
        'bilingual',
      );

      // Plays immediately instead of blocking on a full download...
      expect(result?.audioUrl).toBe('https://example.com/test-bilingual.mp3');
      expect(mockAudioCache.getAudio).not.toHaveBeenCalled();
      // ...and nothing is fetched yet — warming waits until playback is live so
      // the download can't steal bandwidth from the stream (see warmTrackCache).
      expect(mockAudioCache.prefetch).not.toHaveBeenCalled();
    });

    test('uses a supplied article instead of refetching it', async () => {
      mockGenerateStorageUrl.mockImplementation(bucket => {
        if (bucket === 'audio') return 'https://example.com/test-bilingual.mp3';
        if (bucket === 'images') return 'https://example.com/test-image.jpg';
        return '';
      });
      mockAudioCache.getCachedPath.mockResolvedValue('cached-bilingual.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId(1),
        'bilingual',
        mockArticle as any,
      );

      expect(mockArticlesService.getArticleById).not.toHaveBeenCalled();
      expect(result?.audioUrl).toBe('cached-bilingual.mp3');
    });

    test('handles errors gracefully and returns null', async () => {
      const error = new Error('Article not found');
      mockArticlesService.getArticleById.mockRejectedValue(error);

      const result = await enhancedAudioService.generateEnhancedAudioTrack(articleId(1));

      expect(result).toBeNull();
      expect(mockHandleError).toHaveBeenCalledWith(error, {
        toastMessage: STRINGS.FAILED_TO_GENERATE_AUDIO_TRACK,
        analyticsEventName: 'Enhanced_Audio_Generation_Error',
        sentrySeverity: 'error',
        showToast: true,
        analyticsProperties: { articleId: 1 },
      });
    });
  });

  describe('getReadingListEnhancedTracks', () => {
    const mockReadingList = [
      {
        article_id: 1,
        articles: {
          title: 'Article 1',
          audio_url: 'audio1.mp3',
          audio_url_bilingual: 'bilingual1.mp3',
          image_url: 'image1.jpg',
        },
      },
      {
        article_id: 2,
        articles: {
          title: 'Article 2',
          audio_url: 'audio2.mp3',
          audio_url_bilingual: null,
          image_url: 'image2.jpg',
        },
      },
    ];

    test('processes all reading list items with bilingual preference', async () => {
      mockBookmarkService.getReadingList.mockResolvedValue(mockReadingList as any);
      let audioCallCount = 0;
      let imageCallCount = 0;
      mockGenerateStorageUrl.mockImplementation((bucket, _path) => {
        if (bucket === 'audio') {
          audioCallCount++;
          return audioCallCount === 1
            ? 'https://example.com/bilingual1.mp3'
            : 'https://example.com/audio2.mp3';
        }
        if (bucket === 'images') {
          imageCallCount++;
          return imageCallCount === 1
            ? 'https://example.com/image1.jpg'
            : 'https://example.com/image2.jpg';
        }
        return '';
      });
      mockAudioCache.getCachedPath
        .mockResolvedValueOnce('cached-bilingual1.mp3')
        .mockResolvedValueOnce('cached-audio2.mp3');

      const result = await enhancedAudioService.getReadingListEnhancedTracks(
        'user123',
        'bilingual',
      );

      expect(result).toEqual([
        {
          id: 'article-1',
          articleId: 1,
          audioUrl: 'cached-bilingual1.mp3',
          sourceUrl: 'https://example.com/bilingual1.mp3',
          title: 'Article 1',
          imageUrl: 'https://example.com/image1.jpg',
        },
        {
          id: 'article-2',
          articleId: 2,
          audioUrl: 'cached-audio2.mp3',
          sourceUrl: 'https://example.com/audio2.mp3',
          title: 'Article 2',
          imageUrl: 'https://example.com/image2.jpg',
        },
      ]);
    });

    test('processes all reading list items with arabic preference', async () => {
      mockBookmarkService.getReadingList.mockResolvedValue(mockReadingList as any);
      let audioCallCount = 0;
      let imageCallCount = 0;
      mockGenerateStorageUrl.mockImplementation((bucket, _path) => {
        if (bucket === 'audio') {
          audioCallCount++;
          return audioCallCount === 1
            ? 'https://example.com/audio1.mp3'
            : 'https://example.com/audio2.mp3';
        }
        if (bucket === 'images') {
          imageCallCount++;
          return imageCallCount === 1
            ? 'https://example.com/image1.jpg'
            : 'https://example.com/image2.jpg';
        }
        return '';
      });
      mockAudioCache.getCachedPath
        .mockResolvedValueOnce('cached-audio1.mp3')
        .mockResolvedValueOnce('cached-audio2.mp3');

      const result = await enhancedAudioService.getReadingListEnhancedTracks('user123', 'arabic');

      expect(result).toEqual([
        {
          id: 'article-1',
          articleId: 1,
          audioUrl: 'cached-audio1.mp3',
          sourceUrl: 'https://example.com/audio1.mp3',
          title: 'Article 1',
          imageUrl: 'https://example.com/image1.jpg',
        },
        {
          id: 'article-2',
          articleId: 2,
          audioUrl: 'cached-audio2.mp3',
          sourceUrl: 'https://example.com/audio2.mp3',
          title: 'Article 2',
          imageUrl: 'https://example.com/image2.jpg',
        },
      ]);
    });

    test('reports and rethrows a failure instead of answering with an empty playlist', async () => {
      const error = new Error('Reading list fetch failed');
      mockBookmarkService.getReadingList.mockRejectedValue(error);

      // An empty array would be cached as a successful, empty playlist: no
      // retry, no error state, and a failed refetch would wipe good tracks.
      await expect(enhancedAudioService.getReadingListEnhancedTracks('user123')).rejects.toBe(
        error,
      );
      expect(mockHandleError).toHaveBeenCalledWith(error, {
        toastMessage: STRINGS.FAILED_TO_GET_ENHANCED_AUDIO_TRACKS,
        analyticsEventName: 'Enhanced_Audio_Playlist_Error',
        sentrySeverity: 'error',
        showToast: false,
        analyticsProperties: { userId: 'user123' },
      });
    });

    test('handles empty reading list', async () => {
      mockBookmarkService.getReadingList.mockResolvedValue([]);

      const result = await enhancedAudioService.getReadingListEnhancedTracks('user123');

      expect(result).toEqual([]);
    });

    test('warmTrackCache caches a streaming track but not an already-local one', () => {
      warmTrackCache({
        id: 'article-1',
        audioUrl: 'https://example.com/audio.mp3',
        sourceUrl: 'https://example.com/audio.mp3',
        title: 'Streaming',
      });
      expect(mockAudioCache.prefetch).toHaveBeenCalledWith('https://example.com/audio.mp3');

      mockAudioCache.prefetch.mockClear();

      warmTrackCache({
        id: 'article-2',
        audioUrl: 'file:///cache/audio.mp3',
        sourceUrl: 'https://example.com/audio.mp3',
        title: 'Already cached',
      });
      expect(mockAudioCache.prefetch).not.toHaveBeenCalled();
    });

    test('does not download audio for uncached items', async () => {
      // This runs from an app-wide query, so warming here would download every
      // saved article's audio at app start.
      mockBookmarkService.getReadingList.mockResolvedValue(mockReadingList as any);
      mockGenerateStorageUrl.mockImplementation(bucket =>
        bucket === 'audio' ? 'https://example.com/audio.mp3' : 'https://example.com/image.jpg',
      );
      mockAudioCache.getCachedPath.mockResolvedValue(null);

      const result = await enhancedAudioService.getReadingListEnhancedTracks('user123');

      expect(mockAudioCache.prefetch).not.toHaveBeenCalled();
      expect(mockAudioCache.getAudio).not.toHaveBeenCalled();
      // Still usable — they stream if the user plays one
      expect(result[0]?.audioUrl).toBe('https://example.com/audio.mp3');
    });
  });
});
