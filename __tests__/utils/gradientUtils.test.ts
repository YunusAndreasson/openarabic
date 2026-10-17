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
    test('should calculate header height with safe area', () => {
      const safeAreaTop = 50;
      const result = calculateHeaderHeight(safeAreaTop, 375);

      // Should be positive and include safe area
      expect(result).toBeGreaterThan(safeAreaTop);
      expect(typeof result).toBe('number');
    });

    test('should handle zero safe area', () => {
      const result = calculateHeaderHeight(0, 375);
      expect(result).toBeGreaterThan(0);
    });

    test('follows the window width: the image is the width over the golden ratio', () => {
      expect(calculateHeaderHeight(0, 375)).toBe(Math.round(375 / 1.618));
      expect(calculateHeaderHeight(0, 800)).toBe(Math.round(800 / 1.618));
    });
  });

  describe('createImageGradientColors', () => {
    test('should create dark mode gradient colors', () => {
      const result = createImageGradientColors(mockDarkThemeColors);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toContain('rgba(0,0,0,0.03)');
      expect(result[6]).toContain('rgba(0,0,0,0.4)');
    });

    test('should create light mode gradient colors using gradientOverlay', () => {
      const result = createImageGradientColors(mockLightThemeColors);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toContain('rgba(245,245,220,0.03)');
      expect(result[6]).toContain('rgba(245,245,220,0.4)');
    });
  });

  describe('createBackgroundGradientColors', () => {
    test('should create dark mode background gradient', () => {
      const result = createBackgroundGradientColors(mockDarkThemeColors);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toBe('transparent');
      expect(result[9]).toBe(mockDarkThemeColors.background);
    });

    test('should create light mode background gradient', () => {
      const result = createBackgroundGradientColors(mockLightThemeColors);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toBe('transparent');
      expect(result[9]).toBe(mockLightThemeColors.background);
    });
  });
});
