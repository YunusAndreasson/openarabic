import { generateAudioUrl, generateImageUrl } from '../../utils/imageUtils';

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
      expect(result).toContain('/storage/v1/object/public/images/test.jpg');
    });

    it('should reconstruct URLs for relative paths (treats them as filenames)', () => {
      const result = generateImageUrl('images/test.jpg');
      expect(result).toContain('/storage/v1/object/public/images/images/test.jpg');
    });
  });

  describe('generateAudioUrl', () => {
    it('should return undefined for null/undefined input', () => {
      expect(generateAudioUrl(null)).toBeUndefined();
      expect(generateAudioUrl(undefined)).toBeUndefined();
    });

    it('should return undefined for non-string input', () => {
      expect(generateAudioUrl(123 as any)).toBeUndefined();
      expect(generateAudioUrl({} as any)).toBeUndefined();
    });

    it('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/audio.mp3';
      expect(generateAudioUrl(fullUrl)).toBe(fullUrl);
    });

    it('should reconstruct URLs for audio filenames', () => {
      const result = generateAudioUrl('test.mp3');
      expect(result).toContain('/storage/v1/object/public/audio/test.mp3');
    });
  });

});
