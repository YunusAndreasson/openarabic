// Mock expo-file-system before any imports that use it
jest.mock('expo-file-system', () => ({
  Paths: {
    cache: { uri: '/mock-cache/' },
    document: { uri: '/mock-document/' },
  },
  Directory: jest.fn(),
  File: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
}));
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mock-hash'),
}));

jest.mock('../../services/articles');
jest.mock('../../services/audioCache');
jest.mock('../../services/bookmark', () => ({
  bookmarkService: {
    getReadingList: jest.fn().mockResolvedValue([]),
    addToReadingList: jest.fn().mockResolvedValue(undefined),
    removeFromReadingList: jest.fn().mockResolvedValue(undefined),
  },
}));
// readingList service no longer exists, mocking readingProgress instead
jest.mock('../../services/readingProgress', () => ({
  getReadingProgress: jest.fn().mockResolvedValue([]),
  updateReadingProgress: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/utils/errorHandling');
jest.mock('@/utils/imageUtils');

import { STRINGS } from '@/constants/strings';
import { enhancedAudioService } from '@/services/enhancedAudioService';
import { handleError } from '@/utils/errorHandling';
import { generateAudioUrl, generateImageUrl } from '@/utils/imageUtils';

import { articlesService } from '../../services/articles';
import { audioCache } from '../../services/audioCache';
import { bookmarkService } from '../../services/bookmark';

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;
const mockAudioCache = audioCache as jest.Mocked<typeof audioCache>;
const mockBookmarkService = bookmarkService as jest.Mocked<typeof bookmarkService>;
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockGenerateAudioUrl = generateAudioUrl as jest.MockedFunction<typeof generateAudioUrl>;
const mockGenerateImageUrl = generateImageUrl as jest.MockedFunction<typeof generateImageUrl>;

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

    it('generates bilingual track when preference is bilingual and bilingual URL exists', async () => {
      mockArticlesService.getArticleById.mockResolvedValue(mockArticle as any);
      mockGenerateAudioUrl.mockReturnValue('https://example.com/test-bilingual.mp3');
      mockGenerateImageUrl.mockReturnValue('https://example.com/test-image.jpg');
      mockAudioCache.getAudio.mockResolvedValue('cached-bilingual.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(1, 'bilingual');

      expect(result).toEqual({
        id: 'article-1',
        articleId: 1,
        audioUrl: 'cached-bilingual.mp3',
        title: 'Test Article',
        imageUrl: 'https://example.com/test-image.jpg',
      });
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith('test-bilingual.mp3');
    });

    it('falls back to arabic audio when bilingual preference but no bilingual URL', async () => {
      const articleWithoutBilingual = { ...mockArticle, audio_url_bilingual: null };
      mockArticlesService.getArticleById.mockResolvedValue(articleWithoutBilingual as any);
      mockGenerateAudioUrl.mockReturnValue('https://example.com/test-audio.mp3');
      mockGenerateImageUrl.mockReturnValue('https://example.com/test-image.jpg');
      mockAudioCache.getAudio.mockResolvedValue('cached-arabic.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(1, 'bilingual');

      expect(result).toEqual({
        id: 'article-1',
        articleId: 1,
        audioUrl: 'cached-arabic.mp3',
        title: 'Test Article',
        imageUrl: 'https://example.com/test-image.jpg',
      });
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith('test-audio.mp3');
    });

    it('uses arabic audio when preference is arabic', async () => {
      mockArticlesService.getArticleById.mockResolvedValue(mockArticle as any);
      mockGenerateAudioUrl.mockReturnValue('https://example.com/test-audio.mp3');
      mockGenerateImageUrl.mockReturnValue('https://example.com/test-image.jpg');
      mockAudioCache.getAudio.mockResolvedValue('cached-arabic.mp3');

      const result = await enhancedAudioService.generateEnhancedAudioTrack(1, 'arabic');

      expect(result).toEqual({
        id: 'article-1',
        articleId: 1,
        audioUrl: 'cached-arabic.mp3',
        title: 'Test Article',
        imageUrl: 'https://example.com/test-image.jpg',
      });
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith('test-audio.mp3');
    });

    it('handles errors gracefully and returns null', async () => {
      const error = new Error('Article not found');
      mockArticlesService.getArticleById.mockRejectedValue(error);

      const result = await enhancedAudioService.generateEnhancedAudioTrack(1);

      expect(result).toBeNull();
      expect(mockHandleError).toHaveBeenCalledWith(error, {
        toastMessage: STRINGS.FAILED_TO_GENERATE_AUDIO_TRACK,
        analyticsEventName: 'Enhanced_Audio_Generation_Error',
        sentrySeverity: 'error',
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

    it('processes all reading list items with bilingual preference', async () => {
      mockBookmarkService.getReadingList.mockResolvedValue(mockReadingList as any);
      mockGenerateAudioUrl
        .mockReturnValueOnce('https://example.com/bilingual1.mp3')
        .mockReturnValueOnce('https://example.com/audio2.mp3');
      mockGenerateImageUrl
        .mockReturnValueOnce('https://example.com/image1.jpg')
        .mockReturnValueOnce('https://example.com/image2.jpg');
      mockAudioCache.getAudio
        .mockResolvedValueOnce('cached-bilingual1.mp3')
        .mockResolvedValueOnce('cached-audio2.mp3');

      const result = await enhancedAudioService.getReadingListEnhancedTracks(
        'user123',
        'bilingual'
      );

      expect(result).toEqual([
        {
          id: 'article-1',
          articleId: 1,
          audioUrl: 'cached-bilingual1.mp3',
          title: 'Article 1',
          imageUrl: 'https://example.com/image1.jpg',
        },
        {
          id: 'article-2',
          articleId: 2,
          audioUrl: 'cached-audio2.mp3',
          title: 'Article 2',
          imageUrl: 'https://example.com/image2.jpg',
        },
      ]);
    });

    it('processes all reading list items with arabic preference', async () => {
      mockBookmarkService.getReadingList.mockResolvedValue(mockReadingList as any);
      mockGenerateAudioUrl
        .mockReturnValueOnce('https://example.com/audio1.mp3')
        .mockReturnValueOnce('https://example.com/audio2.mp3');
      mockGenerateImageUrl
        .mockReturnValueOnce('https://example.com/image1.jpg')
        .mockReturnValueOnce('https://example.com/image2.jpg');
      mockAudioCache.getAudio
        .mockResolvedValueOnce('cached-audio1.mp3')
        .mockResolvedValueOnce('cached-audio2.mp3');

      const result = await enhancedAudioService.getReadingListEnhancedTracks('user123', 'arabic');

      expect(result).toEqual([
        {
          id: 'article-1',
          articleId: 1,
          audioUrl: 'cached-audio1.mp3',
          title: 'Article 1',
          imageUrl: 'https://example.com/image1.jpg',
        },
        {
          id: 'article-2',
          articleId: 2,
          audioUrl: 'cached-audio2.mp3',
          title: 'Article 2',
          imageUrl: 'https://example.com/image2.jpg',
        },
      ]);
    });

    it('handles errors gracefully and returns empty array', async () => {
      const error = new Error('Reading list fetch failed');
      mockBookmarkService.getReadingList.mockRejectedValue(error);

      const result = await enhancedAudioService.getReadingListEnhancedTracks('user123');

      expect(result).toEqual([]);
      expect(mockHandleError).toHaveBeenCalledWith(error, {
        toastMessage: STRINGS.FAILED_TO_GET_ENHANCED_AUDIO_TRACKS,
        analyticsEventName: 'Enhanced_Audio_Playlist_Error',
        sentrySeverity: 'error',
      });
    });

    it('handles empty reading list', async () => {
      mockBookmarkService.getReadingList.mockResolvedValue([]);

      const result = await enhancedAudioService.getReadingListEnhancedTracks('user123');

      expect(result).toEqual([]);
    });
  });
});