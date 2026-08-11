/**
 * Layout Utils Tests
 *
 * Tests layout utility functions for padding, margin, and styles.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import {
  COMMON_STYLES,
  createAndroidRipple,
  createMargin,
  createPadding,
} from '@/utils/layoutUtils';

describe('layoutUtils', () => {
  describe('createPadding', () => {
    test('should create padding with all option', () => {
      const result = createPadding({ all: 'MEDIUM' });
      expect(result).toEqual({ padding: LAYOUT.SPACING.MEDIUM });
    });

    test('should create padding with horizontal option', () => {
      const result = createPadding({ horizontal: 'LARGE' });
      expect(result).toEqual({ paddingHorizontal: LAYOUT.SPACING.LARGE });
    });

    test('should create padding with vertical option', () => {
      const result = createPadding({ vertical: 'SMALL' });
      expect(result).toEqual({ paddingVertical: LAYOUT.SPACING.SMALL });
    });

    test('should create padding with top option', () => {
      const result = createPadding({ top: 'XLARGE' });
      expect(result).toEqual({ paddingTop: LAYOUT.SPACING.XLARGE });
    });

    test('should create padding with bottom option', () => {
      const result = createPadding({ bottom: 'TINY' });
      expect(result).toEqual({ paddingBottom: LAYOUT.SPACING.TINY });
    });

    test('should create padding with left option', () => {
      const result = createPadding({ left: 'MEDIUM' });
      expect(result).toEqual({ paddingLeft: LAYOUT.SPACING.MEDIUM });
    });

    test('should create padding with right option', () => {
      const result = createPadding({ right: 'LARGE' });
      expect(result).toEqual({ paddingRight: LAYOUT.SPACING.LARGE });
    });

    test('should combine multiple padding options', () => {
      const result = createPadding({
        horizontal: 'MEDIUM',
        vertical: 'SMALL',
      });
      expect(result).toEqual({
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        paddingVertical: LAYOUT.SPACING.SMALL,
      });
    });

    test('should combine specific directional padding', () => {
      const result = createPadding({
        top: 'LARGE',
        bottom: 'SMALL',
        left: 'MEDIUM',
        right: 'TINY',
      });
      expect(result).toEqual({
        paddingTop: LAYOUT.SPACING.LARGE,
        paddingBottom: LAYOUT.SPACING.SMALL,
        paddingLeft: LAYOUT.SPACING.MEDIUM,
        paddingRight: LAYOUT.SPACING.TINY,
      });
    });

    test('should prioritize all option over other options', () => {
      const result = createPadding({
        all: 'MEDIUM',
        horizontal: 'LARGE', // Should be ignored
      });
      expect(result).toEqual({ padding: LAYOUT.SPACING.MEDIUM });
    });
  });

  describe('createMargin', () => {
    test('should create margin with all option', () => {
      const result = createMargin({ all: 'MEDIUM' });
      expect(result).toEqual({ margin: LAYOUT.SPACING.MEDIUM });
    });

    test('should create margin with horizontal option', () => {
      const result = createMargin({ horizontal: 'LARGE' });
      expect(result).toEqual({ marginHorizontal: LAYOUT.SPACING.LARGE });
    });

    test('should create margin with vertical option', () => {
      const result = createMargin({ vertical: 'SMALL' });
      expect(result).toEqual({ marginVertical: LAYOUT.SPACING.SMALL });
    });

    test('should create margin with top option', () => {
      const result = createMargin({ top: 'XLARGE' });
      expect(result).toEqual({ marginTop: LAYOUT.SPACING.XLARGE });
    });

    test('should create margin with bottom option', () => {
      const result = createMargin({ bottom: 'TINY' });
      expect(result).toEqual({ marginBottom: LAYOUT.SPACING.TINY });
    });

    test('should create margin with left option', () => {
      const result = createMargin({ left: 'MEDIUM' });
      expect(result).toEqual({ marginLeft: LAYOUT.SPACING.MEDIUM });
    });

    test('should create margin with right option', () => {
      const result = createMargin({ right: 'LARGE' });
      expect(result).toEqual({ marginRight: LAYOUT.SPACING.LARGE });
    });

    test('should combine multiple margin options', () => {
      const result = createMargin({
        horizontal: 'MEDIUM',
        vertical: 'SMALL',
      });
      expect(result).toEqual({
        marginHorizontal: LAYOUT.SPACING.MEDIUM,
        marginVertical: LAYOUT.SPACING.SMALL,
      });
    });

    test('should combine specific directional margin', () => {
      const result = createMargin({
        top: 'LARGE',
        bottom: 'SMALL',
        left: 'MEDIUM',
        right: 'TINY',
      });
      expect(result).toEqual({
        marginTop: LAYOUT.SPACING.LARGE,
        marginBottom: LAYOUT.SPACING.SMALL,
        marginLeft: LAYOUT.SPACING.MEDIUM,
        marginRight: LAYOUT.SPACING.TINY,
      });
    });

    test('should prioritize all option over other options', () => {
      const result = createMargin({
        all: 'MEDIUM',
        horizontal: 'LARGE', // Should be ignored
      });
      expect(result).toEqual({ margin: LAYOUT.SPACING.MEDIUM });
    });
  });

  describe('createAndroidRipple', () => {
    const mockColors: ThemeColors = {
      navigationRipple: 'rgba(0, 0, 0, 0.1)',
    } as ThemeColors;

    test('should create small ripple', () => {
      const result = createAndroidRipple(mockColors, 'small');
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.SMALL / 2,
        foreground: false,
      });
    });

    test('should create medium ripple', () => {
      const result = createAndroidRipple(mockColors, 'medium');
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.MEDIUM / 2,
        foreground: false,
      });
    });

    test('should create large ripple', () => {
      const result = createAndroidRipple(mockColors, 'large');
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.LARGE / 2,
        foreground: false,
      });
    });

    test('should default to medium ripple', () => {
      const result = createAndroidRipple(mockColors);
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.MEDIUM / 2,
        foreground: false,
      });
    });

    test('should use theme color from colors object', () => {
      const customColors: ThemeColors = {
        navigationRipple: 'rgba(255, 0, 0, 0.2)',
      } as ThemeColors;
      const result = createAndroidRipple(customColors, 'small');
      expect(result.color).toBe('rgba(255, 0, 0, 0.2)');
    });
  });

  describe('COMMON_STYLES', () => {
    test('should have correct row style', () => {
      expect(COMMON_STYLES.row).toEqual({
        flexDirection: 'row',
        alignItems: 'center',
      });
    });

    test('should have correct centeredRow style', () => {
      expect(COMMON_STYLES.centeredRow).toEqual({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      });
    });

    test('should have correct roundedMedium style', () => {
      expect(COMMON_STYLES.roundedMedium).toEqual({
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
      });
    });

    test('should have correct fullWidth style', () => {
      expect(COMMON_STYLES.fullWidth).toEqual({
        width: '100%',
      });
    });

    test('should have correct flex1 style', () => {
      expect(COMMON_STYLES.flex1).toEqual({
        flex: 1,
      });
    });
  });
});
