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
  createStrongDarkOverlayGradient,
  createThemeBackgroundGradient,
} from '@/utils/gradientUtils';

// Mock theme colors for testing
const mockThemeColors = {
  black: '#000000',
  white: '#FFFFFF',
  background: '#F5F5DC', // Sepia background
  shadow: '#000000',
  warning: '#FFA500',
} as const;

describe('gradientUtils', () => {
  describe('calculateHeaderHeight', () => {
    test('should calculate header height with safe area', () => {
      const safeAreaTop = 50;
      const result = calculateHeaderHeight(safeAreaTop);

      // Should be positive and include safe area
      expect(result).toBeGreaterThan(safeAreaTop);
      expect(typeof result).toBe('number');
    });

    test('should handle zero safe area', () => {
      const result = calculateHeaderHeight(0);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('createImageGradientColors', () => {
    test('should create dark mode gradient colors', () => {
      const result = createImageGradientColors(mockThemeColors, true);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toContain('rgba(0,0,0,0.03)');
      expect(result[6]).toContain('rgba(0,0,0,0.4)');
    });

    test('should create light mode gradient colors', () => {
      const result = createImageGradientColors(mockThemeColors, false);

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toContain('rgba(245,245,220,0.03)'); // Sepia background
      expect(result[6]).toContain('rgba(245,245,220,0.4)');
    });
  });

  describe('createBackgroundGradientColors', () => {
    test('should create dark mode background gradient', () => {
      const result = createBackgroundGradientColors(mockThemeColors, true);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toBe('transparent');
      expect(result[9]).toBe(mockThemeColors.background);
    });

    test('should create light mode background gradient', () => {
      const result = createBackgroundGradientColors(mockThemeColors, false);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toBe('transparent');
      expect(result[9]).toBe(mockThemeColors.background);
    });
  });

  describe('createStrongDarkOverlayGradient', () => {
    test('should create strong dark overlay gradient with sage-tinted black', () => {
      const result = createStrongDarkOverlayGradient();

      expect(result).toHaveLength(7);
      expect(result[0]).toBe('transparent');
      // Uses sage-tinted black (#0A0F0B = rgba(10,15,11)) from OKLCH color system
      expect(result[1]).toBe('rgba(10,15,11,0.1)');
      expect(result[6]).toBe('rgba(10,15,11,0.95)');
    });
  });

  describe('createThemeBackgroundGradient', () => {
    test('should create theme background gradient with hex opacity', () => {
      const backgroundColor = '#F5F5DC';
      const result = createThemeBackgroundGradient(backgroundColor);

      expect(result).toHaveLength(10);
      expect(result[0]).toBe('transparent');
      expect(result[1]).toBe('transparent');
      expect(result[2]).toBe('transparent');
      expect(result[3]).toBe('#F5F5DC15');
      expect(result[9]).toBe(backgroundColor);
    });
  });
});
