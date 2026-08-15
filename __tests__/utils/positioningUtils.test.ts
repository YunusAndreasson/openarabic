/**
 * Positioning Utils Tests
 *
 * Tests positioning utility functions for tooltips.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import {
  TOOLTIP_CONSTANTS,
  calculateTooltipDimensions,
  type TooltipLayout,
} from '@/utils/positioningUtils';

describe('Positioning Utilities', () => {
  describe('TOOLTIP_CONSTANTS', () => {
    test('should have correct constant values', () => {
      expect(TOOLTIP_CONSTANTS.ARROW_SIZE).toBe(6);
      expect(TOOLTIP_CONSTANTS.MIN_PADDING).toBe(8);
      expect(TOOLTIP_CONSTANTS.SCREEN_MARGIN).toBe(16);
      expect(TOOLTIP_CONSTANTS.Z_INDEX).toBe(999999);
      expect(TOOLTIP_CONSTANTS.MIN_WIDTH).toBe(120);
      expect(TOOLTIP_CONSTANTS.HEIGHT).toBe(44);
      expect(TOOLTIP_CONSTANTS.CHAR_WIDTH).toBe(9);
      expect(TOOLTIP_CONSTANTS.BOOKMARK_WIDTH).toBe(32);
      expect(TOOLTIP_CONSTANTS.GAP_WIDTH).toBe(8);
    });
  });

  describe('calculateTooltipDimensions', () => {
    const mockLayout: TooltipLayout = {
      x: 100,
      y: 200,
      width: 50,
      height: 30,
    };

    test('should calculate dimensions for simple text without bookmark', () => {
      const result = calculateTooltipDimensions(mockLayout, 'Hello', false);

      expect(result.tooltipTop).toBe(156); // 200 - 44
      expect(result.tooltipWidth).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.MIN_WIDTH);
      expect(result.tooltipHeight).toBe(TOOLTIP_CONSTANTS.HEIGHT);
      expect(result.arrowLeft).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.ARROW_SIZE);
    });

    test('should calculate dimensions for text with bookmark', () => {
      const result = calculateTooltipDimensions(mockLayout, 'Hello', true);

      expect(result.tooltipTop).toBe(156);
      expect(result.tooltipWidth).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.MIN_WIDTH);
      expect(result.tooltipHeight).toBe(TOOLTIP_CONSTANTS.HEIGHT);
    });

    test('should handle long text', () => {
      const longText = 'This is a very long text that should increase the tooltip width';
      const result = calculateTooltipDimensions(mockLayout, longText, false);

      expect(result.tooltipWidth).toBeGreaterThan(TOOLTIP_CONSTANTS.MIN_WIDTH);
    });

    test('should handle edge positioning near screen boundaries', () => {
      const edgeLayout: TooltipLayout = {
        x: 0,
        y: 200,
        width: 50,
        height: 30,
      };

      const result = calculateTooltipDimensions(edgeLayout, 'Test', false);
      expect(result.tooltipLeft).toBe(TOOLTIP_CONSTANTS.SCREEN_MARGIN);
    });

    test('should handle default container width', () => {
      const result = calculateTooltipDimensions(mockLayout, 'Test', false, undefined, 0);

      // Should position normally when using default container width (SCREEN_WIDTH)
      expect(result.tooltipTop).toBe(156);
      expect(result.tooltipWidth).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.MIN_WIDTH);
    });

    test('should respect screen margin on left edge', () => {
      const edgeLayout: TooltipLayout = {
        x: 10, // Position near left edge
        y: 200,
        width: 50,
        height: 30,
      };

      const result = calculateTooltipDimensions(edgeLayout, 'Test', false);

      // Tooltip should respect SCREEN_MARGIN (16px)
      expect(result.tooltipLeft).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.SCREEN_MARGIN);
    });

    test('should use container width when provided', () => {
      const layout: TooltipLayout = {
        x: 300, // Near right edge
        y: 200,
        width: 50,
        height: 30,
      };

      const containerWidth = 350; // Container is 350px wide
      const result = calculateTooltipDimensions(layout, 'Test', false, undefined, containerWidth);

      // With containerWidth=350, right boundary should be at 350 - 16 = 334px
      // Tooltip should not exceed this boundary
      const rightEdge = result.tooltipLeft + result.tooltipWidth;
      expect(rightEdge).toBeLessThanOrEqual(334);
    });

    test('should handle container with right padding', () => {
      const layout: TooltipLayout = {
        x: 280, // Near right edge
        y: 200,
        width: 50,
        height: 30,
      };

      const containerWidth = 335; // Container is 335px wide
      const result = calculateTooltipDimensions(
        layout,
        'Long text for tooltip',
        false,
        undefined,
        containerWidth,
      );

      // Right boundary at containerWidth - SCREEN_MARGIN = 335 - 16 = 319px
      const rightEdge = result.tooltipLeft + result.tooltipWidth;
      expect(rightEdge).toBeLessThanOrEqual(319);
    });

    test('should fallback to SCREEN_WIDTH when containerWidth is 0', () => {
      const layout: TooltipLayout = {
        x: 300,
        y: 200,
        width: 50,
        height: 30,
      };

      const containerWidth = 0; // Not provided
      const result = calculateTooltipDimensions(layout, 'Test', false, undefined, containerWidth);

      // When containerWidth is 0, falls back to SCREEN_WIDTH (375px)
      // Right boundary at 375 - 16 = 359px
      const rightEdge = result.tooltipLeft + result.tooltipWidth;
      expect(rightEdge).toBeLessThanOrEqual(359);
    });
  });
});
