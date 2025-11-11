/**
 * Cache Utils Tests
 *
 * Tests cache utility functions for byte formatting and URL detection.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test, jest } from '@jest/globals';

// Mock the strings constants before importing cacheUtils
jest.mock('@/constants/strings', () => ({
  STRINGS: {
    BYTE_UNITS: ['Bytes', 'KB', 'MB', 'GB', 'TB'],
  },
}));

import { formatBytes, isRemoteAudioUrl } from '../../utils/cacheUtils';

describe('formatBytes', () => {
  test('handles zero bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  test('formats various byte sizes', () => {
    expect(formatBytes(1023)).toBe('1023 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  test('respects decimal places', () => {
    expect(formatBytes(2000, 2)).toBe('1.95 KB');
    expect(formatBytes(2000, 0)).toBe('2 KB');
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });
});

describe('isRemoteAudioUrl', () => {
  test('detects remote urls', () => {
    expect(isRemoteAudioUrl('http://example.com/audio.mp3')).toBe(true);
    expect(isRemoteAudioUrl('https://example.com/audio.mp3')).toBe(true);
  });

  test('detects local urls', () => {
    expect(isRemoteAudioUrl('file:///audio.mp3')).toBe(false);
    expect(isRemoteAudioUrl('/local/path/audio.mp3')).toBe(false);
  });
});
