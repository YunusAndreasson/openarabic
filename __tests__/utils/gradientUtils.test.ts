/**
 * Gradient Utils Tests
 *
 * Tests gradient utility functions for UI overlays and backgrounds.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import {
  calculateHeaderHeight,
  createBackgroundGradientColors,
  createImageGradientColors,
} from '@/utils/gradientUtils';
import { createThemeColorsMock } from '@/__tests__/helpers/themeMocks';

// gradientOverlay is the theme-aware overlay base colour these tests vary.
const mockDarkThemeColors = createThemeColorsMock({
  background: '#1A2B23',
  gradientOverlay: '#000000', // Dark mode uses black overlay
  shadow: '#000000',
  warning: '#FFA500',
});

const mockLightThemeColors = createThemeColorsMock({
  background: '#F5F5DC',
  gradientOverlay: '#F5F5DC', // Light/sepia uses background as overlay
  shadow: '#000000',
  warning: '#FFA500',
});

describe('gradientUtils', () => {
  describe('calculateHeaderHeight', () => {
    test.each([
      [320, 198],
      [375, 232],
      [430, 266],
      [599, 370],
    ])('preserves the phone header height at width %i', (width, height) => {
      expect(calculateHeaderHeight(0, width)).toBe(height);
      expect(calculateHeaderHeight(50, width)).toBe(height + 50);
    });

    test('grows up to the 720-point reading column and stays capped on wider windows', () => {
      expect(calculateHeaderHeight(0, 680)).toBe(420);
      expect(calculateHeaderHeight(0, 720)).toBe(445);
      expect(calculateHeaderHeight(0, 800)).toBe(445);
      expect(calculateHeaderHeight(50, 1024)).toBe(495);
    });
  });

  // The clear stops are the overlay itself at zero opacity. The `transparent`
  // keyword is rgba(0,0,0,0): a light theme's ramp would fade in through grey,
  // since React Native only rewrites a transparent stop on iOS.
  describe('createImageGradientColors', () => {
    test('should create dark mode gradient colors', () => {
      const result = createImageGradientColors(mockDarkThemeColors);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('rgba(0,0,0,0)');
      expect(result[1]).toBe('rgba(0,0,0,0)');
      expect(result[2]).toContain('rgba(0,0,0,0.03)');
      expect(result[6]).toContain('rgba(0,0,0,0.4)');
    });

    test('should create light mode gradient colors using gradientOverlay', () => {
      const result = createImageGradientColors(mockLightThemeColors);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('rgba(245,245,220,0)');
      expect(result[1]).toBe('rgba(245,245,220,0)');
      expect(result[2]).toContain('rgba(245,245,220,0.03)');
      expect(result[6]).toContain('rgba(245,245,220,0.4)');
    });
  });

  describe('createBackgroundGradientColors', () => {
    test('should create dark mode background gradient', () => {
      const result = createBackgroundGradientColors(mockDarkThemeColors);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('rgba(0,0,0,0)');
      expect(result[1]).toBe('rgba(0,0,0,0)');
      expect(result[2]).toBe('rgba(0,0,0,0)');
      expect(result[9]).toBe(mockDarkThemeColors.background);
    });

    test('should create light mode background gradient', () => {
      const result = createBackgroundGradientColors(mockLightThemeColors);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('rgba(245,245,220,0)');
      expect(result[1]).toBe('rgba(245,245,220,0)');
      expect(result[2]).toBe('rgba(245,245,220,0)');
      expect(result[9]).toBe(mockLightThemeColors.background);
    });
  });
});
