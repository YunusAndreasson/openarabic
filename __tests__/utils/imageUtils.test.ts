/**
 * Storage Utils Tests
 *
 * Tests storage URL generation utilities.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 */

import { beforeEach, describe, expect, test, jest } from '@jest/globals';

import { generateStorageUrl, isValidStoragePath } from '../../utils/storageUtils';
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

describe('storageUtils', () => {
  describe('isValidStoragePath', () => {
    test('should return false for null/undefined', () => {
      expect(isValidStoragePath(null)).toBeFalsy();
      expect(isValidStoragePath(undefined)).toBeFalsy();
    });

    test('should return false for non-string input', () => {
      expect(isValidStoragePath(123)).toBeFalsy();
      expect(isValidStoragePath({})).toBeFalsy();
    });

    test('should return false for empty strings', () => {
      expect(isValidStoragePath('')).toBeFalsy();
      expect(isValidStoragePath('   ')).toBeFalsy();
    });

    test('should return true for valid paths', () => {
      expect(isValidStoragePath('test.jpg')).toBeTruthy();
      expect(isValidStoragePath('folder/file.mp3')).toBeTruthy();
    });
  });

  describe('generateStorageUrl for images', () => {
    test('should return empty string for null/undefined input', () => {
      expect(generateStorageUrl('images', null)).toBe('');
      expect(generateStorageUrl('images', undefined)).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(generateStorageUrl('images', 123 as any)).toBe('');
      expect(generateStorageUrl('images', {} as any)).toBe('');
    });

    test('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/image.jpg';
      expect(generateStorageUrl('images', fullUrl)).toBe(fullUrl);

      const httpUrl = 'http://example.com/image.png';
      expect(generateStorageUrl('images', httpUrl)).toBe(httpUrl);
    });

    test('should generate URLs for filenames using Supabase SDK', () => {
      const result = generateStorageUrl('images', 'test.jpg');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
      expect(fromMock).toHaveBeenCalledWith('images');
    });

    test('should generate URLs for relative paths', () => {
      const result = generateStorageUrl('images', 'folder/test.jpg');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
    });
  });

  describe('generateStorageUrl for audio', () => {
    test('should return empty string for null/undefined input', () => {
      expect(generateStorageUrl('audio', null)).toBe('');
      expect(generateStorageUrl('audio', undefined)).toBe('');
    });

    test('should return empty string for non-string input', () => {
      expect(generateStorageUrl('audio', 123 as any)).toBe('');
      expect(generateStorageUrl('audio', {} as any)).toBe('');
    });

    test('should return full URLs as-is', () => {
      const fullUrl = 'https://example.com/audio.mp3';
      expect(generateStorageUrl('audio', fullUrl)).toBe(fullUrl);
    });

    test('should generate URLs for audio filenames using Supabase SDK', () => {
      const result = generateStorageUrl('audio', 'test.mp3');
      // Uses Supabase SDK getPublicUrl() which returns mocked URL
      expect(result).toBe('https://example.com/file.jpg');
      expect(fromMock).toHaveBeenCalledWith('audio');
    });
  });
});
