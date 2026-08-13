/**
 * Text Style Utils Tests
 *
 * Tests text styling utility functions for UI rendering.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import {
  TEXT_STYLE_CONSTANTS,
  calculateDynamicPadding,
  createTextStyleBase,
} from '@/utils/textStyleUtils';

describe('textStyleUtils', () => {
  const mockFontSize = 20;

  describe('TEXT_STYLE_CONSTANTS', () => {
    test('should have correct constant values', () => {
      expect(TEXT_STYLE_CONSTANTS.PADDING_TOP_RATIO).toBe(0.15);
      expect(TEXT_STYLE_CONSTANTS.PADDING_BOTTOM_RATIO).toBe(0.05);
    });
  });

  describe('calculateDynamicPadding', () => {
    test('should calculate padding correctly with default ratios', () => {
      const result = calculateDynamicPadding(mockFontSize);
      expect(result.paddingTop).toBe(mockFontSize * 0.15);
      expect(result.paddingBottom).toBe(mockFontSize * 0.05);
    });

    test('should handle zero font size', () => {
      const result = calculateDynamicPadding(0);
      expect(result.paddingTop).toBe(0);
      expect(result.paddingBottom).toBe(0);
    });
  });

  describe('createTextStyleBase', () => {
    test('should create base style with correct properties', () => {
      const result = createTextStyleBase(mockFontSize);

      expect(result).toHaveProperty('fontWeight', '700');
      expect(result).toHaveProperty('textAlign', 'center');
      expect(result).toHaveProperty('includeFontPadding', false);
      expect(result).toHaveProperty('textAlignVertical', 'center');
      expect(result).toHaveProperty('paddingTop', mockFontSize * 0.15);
      expect(result).toHaveProperty('paddingBottom', mockFontSize * 0.05);
    });
  });

  // `createTextStyle` used to be tested here. It was deleted with the elevation
  // migration: it had no callers, and its one distinguishing feature over
  // `createTextStyleBase` was spreading View shadow props onto a TextStyle,
  // which never drew anything.
});
