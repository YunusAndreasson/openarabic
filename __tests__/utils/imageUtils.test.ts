import {
  ImageUrlGenerator,
  generateAudioUrl,
  generateImageUrl,
  reconstructFullUrl,
} from '../../utils/imageUtils';

describe('imageUtils', () => {
  let generator: ImageUrlGenerator;

  beforeEach(() => {
    generator = ImageUrlGenerator.getInstance();
  });

  describe('ImageUrlGenerator', () => {
    describe('generateImageUrl', () => {
      it('should return undefined for null/undefined input', () => {
        expect(generator.generateImageUrl(null)).toBeUndefined();
        expect(generator.generateImageUrl(undefined)).toBeUndefined();
      });

      it('should return undefined for non-string input', () => {
        expect(generator.generateImageUrl(123 as any)).toBeUndefined();
        expect(generator.generateImageUrl({} as any)).toBeUndefined();
      });

      it('should return full URLs as-is', () => {
        const fullUrl = 'https://example.com/image.jpg';
        expect(generator.generateImageUrl(fullUrl)).toBe(fullUrl);

        const httpUrl = 'http://example.com/image.png';
        expect(generator.generateImageUrl(httpUrl)).toBe(httpUrl);
      });

      it('should reconstruct URLs for filenames', () => {
        const result = generator.generateImageUrl('test.jpg');
        expect(result).toContain('/storage/v1/object/public/images/test.jpg');
      });

      it('should reconstruct URLs for relative paths', () => {
        const result = generator.generateImageUrl('images/test.jpg');
        expect(result).toContain('/storage/v1/object/public/images/images/test.jpg');
      });
    });

    describe('generateAudioUrl', () => {
      it('should return undefined for null/undefined input', () => {
        expect(generator.generateAudioUrl(null)).toBeUndefined();
        expect(generator.generateAudioUrl(undefined)).toBeUndefined();
      });

      it('should return full URLs as-is', () => {
        const fullUrl = 'https://example.com/audio.mp3';
        expect(generator.generateAudioUrl(fullUrl)).toBe(fullUrl);
      });

      it('should reconstruct URLs for audio filenames', () => {
        const result = generator.generateAudioUrl('test.mp3');
        expect(result).toContain('/storage/v1/object/public/audio/test.mp3');
      });
    });

    describe('singleton pattern', () => {
      it('should return the same instance', () => {
        const instance1 = ImageUrlGenerator.getInstance();
        const instance2 = ImageUrlGenerator.getInstance();
        expect(instance1).toBe(instance2);
      });
    });
  });

  describe('convenience functions', () => {
    describe('generateImageUrl', () => {
      it('should return empty string for invalid input', () => {
        expect(generateImageUrl(null)).toBe('');
        expect(generateImageUrl(undefined)).toBe('');
      });

      it('should return full URLs as-is', () => {
        const fullUrl = 'https://example.com/image.jpg';
        expect(generateImageUrl(fullUrl)).toBe(fullUrl);
      });
    });

    describe('generateAudioUrl', () => {
      it('should return undefined for invalid input', () => {
        expect(generateAudioUrl(null)).toBeUndefined();
        expect(generateAudioUrl(undefined)).toBeUndefined();
      });

      it('should return full URLs as-is', () => {
        const fullUrl = 'https://example.com/audio.mp3';
        expect(generateAudioUrl(fullUrl)).toBe(fullUrl);
      });
    });

    describe('reconstructFullUrl', () => {
      it('should reconstruct URLs with custom bucket', () => {
        const result = reconstructFullUrl('test.jpg', 'custom-bucket');
        expect(result).toContain('/storage/v1/object/public/custom-bucket/test.jpg');
      });
    });
  });
});
