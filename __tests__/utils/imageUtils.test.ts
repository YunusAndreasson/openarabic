import { generateAudioUrl, generateImageUrl } from '../../utils/imageUtils';
import { supabase } from '../../services/supabase';

// Mock supabase storage for URL generation tests
jest.mock('../../services/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

const storageMock = supabase.storage as jest.Mocked<typeof supabase.storage>;
const fromMock = storageMock.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  // Setup storage mock to return getPublicUrl
  fromMock.mockReturnValue({
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/file.jpg' },
    }),
  } as any);
});

describe('imageUtils', () => {
  describe('generateImageUrl', () => {
    it('should return empty string for null/undefined input', () => {
      expect(generateImageUrl(null)).toBe('');
      expect(generateImageUrl(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(generateImageUrl(123 as any)).toBe('');
      expect(generateImageUrl({} as any)).toBe('');
    });

    it('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/image.jpg';
      expect(generateImageUrl(fullUrl)).toBe(fullUrl);

      const httpUrl = 'http://example.com/image.png';
      expect(generateImageUrl(httpUrl)).toBe(httpUrl);
    });

    it('should reconstruct URLs for filenames', () => {
      const result = generateImageUrl('test.jpg');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });

    it('should reconstruct URLs for relative paths (treats them as filenames)', () => {
      const result = generateImageUrl('images/test.jpg');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });
  });

  describe('generateAudioUrl', () => {
    it('should return empty string for null/undefined input', () => {
      expect(generateAudioUrl(null)).toBe('');
      expect(generateAudioUrl(undefined)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(generateAudioUrl(123 as any)).toBe('');
      expect(generateAudioUrl({} as any)).toBe('');
    });

    it('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/audio.mp3';
      expect(generateAudioUrl(fullUrl)).toBe(fullUrl);
    });

    it('should reconstruct URLs for audio filenames', () => {
      const result = generateAudioUrl('test.mp3');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });
  });
});
