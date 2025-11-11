/**
 * Image Utils Tests
 *
 * Tests image and audio URL generation utilities.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 */

import { beforeEach, describe, expect, test, jest } from '@jest/globals';

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

const storageMock = jest.mocked(supabase.storage);
const fromMock = jest.mocked(storageMock.from);

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
    test('should return empty string for null/undefined input', () => {
      expect(generateImageUrl(null)).toBe('');
      expect(generateImageUrl(undefined)).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(generateImageUrl(123 as any)).toBe('');
      expect(generateImageUrl({} as any)).toBe('');
    });

    test('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/image.jpg';
      expect(generateImageUrl(fullUrl)).toBe(fullUrl);

      const httpUrl = 'http://example.com/image.png';
      expect(generateImageUrl(httpUrl)).toBe(httpUrl);
    });

    test('should reconstruct URLs for filenames', () => {
      const result = generateImageUrl('test.jpg');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });

    test('should reconstruct URLs for relative paths (treats them as filenames)', () => {
      const result = generateImageUrl('images/test.jpg');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });
  });

  describe('generateAudioUrl', () => {
    test('should return empty string for null/undefined input', () => {
      expect(generateAudioUrl(null)).toBe('');
      expect(generateAudioUrl(undefined)).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(generateAudioUrl(123 as any)).toBe('');
      expect(generateAudioUrl({} as any)).toBe('');
    });

    test('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/audio.mp3';
      expect(generateAudioUrl(fullUrl)).toBe(fullUrl);
    });

    test('should reconstruct URLs for audio filenames', () => {
      const result = generateAudioUrl('test.mp3');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });
  });
});
