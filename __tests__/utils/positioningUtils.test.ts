import {
  TOOLTIP_CONSTANTS,
  calculateTooltipDimensions,
  type TooltipLayout,
} from '@/utils/positioningUtils';

describe('Positioning Utilities', () => {
  describe('TOOLTIP_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(TOOLTIP_CONSTANTS.ARROW_SIZE).toBe(6);
      expect(TOOLTIP_CONSTANTS.MIN_PADDING).toBe(8);
      expect(TOOLTIP_CONSTANTS.SCREEN_MARGIN).toBe(16);
      expect(TOOLTIP_CONSTANTS.Z_INDEX).toBe(999999);
      expect(TOOLTIP_CONSTANTS.MIN_WIDTH).toBe(70);
      expect(TOOLTIP_CONSTANTS.HEIGHT).toBe(32);
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

    it('should calculate dimensions for simple text without bookmark', () => {
      const result = calculateTooltipDimensions(mockLayout, 'Hello', false);

      expect(result.tooltipTop).toBe(168); // 200 - 32
      expect(result.tooltipWidth).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.MIN_WIDTH);
      expect(result.tooltipHeight).toBe(TOOLTIP_CONSTANTS.HEIGHT);
      expect(result.arrowLeft).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.ARROW_SIZE);
    });

    it('should calculate dimensions for text with bookmark', () => {
      const result = calculateTooltipDimensions(mockLayout, 'Hello', true);

      expect(result.tooltipTop).toBe(168);
      expect(result.tooltipWidth).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.MIN_WIDTH);
      expect(result.tooltipHeight).toBe(TOOLTIP_CONSTANTS.HEIGHT);
    });

    it('should handle long text', () => {
      const longText = 'This is a very long text that should increase the tooltip width';
      const result = calculateTooltipDimensions(mockLayout, longText, false);

      expect(result.tooltipWidth).toBeGreaterThan(TOOLTIP_CONSTANTS.MIN_WIDTH);
    });

    it('should handle edge positioning near screen boundaries', () => {
      const edgeLayout: TooltipLayout = {
        x: 0,
        y: 200,
        width: 50,
        height: 30,
      };

      const result = calculateTooltipDimensions(edgeLayout, 'Test', false);
      expect(result.tooltipLeft).toBe(TOOLTIP_CONSTANTS.SCREEN_MARGIN);
    });

    it('should handle container offset of 0 (baseline)', () => {
      const result = calculateTooltipDimensions(mockLayout, 'Test', false, undefined, 0);

      // Should position normally when container is at screen origin
      expect(result.tooltipTop).toBe(168);
      expect(result.tooltipWidth).toBeGreaterThanOrEqual(TOOLTIP_CONSTANTS.MIN_WIDTH);
    });

    it('should handle positive container offset (safe area)', () => {
      const edgeLayout: TooltipLayout = {
        x: 10, // Container-relative position
        y: 200,
        width: 50,
        height: 30,
      };

      const containerOffset = 10; // Container is 10px from screen left
      const result = calculateTooltipDimensions(
        edgeLayout,
        'Test',
        false,
        undefined,
        containerOffset,
      );

      // effectiveScreenMargin = max(0, 16 - 10) = 6px
      // With word at container-relative x=10, tooltip should be positioned to respect effective margin
      expect(result.tooltipLeft).toBeGreaterThanOrEqual(6);
    });

    it('should handle large container offset', () => {
      const edgeLayout: TooltipLayout = {
        x: 5, // Container-relative position near edge
        y: 200,
        width: 50,
        height: 30,
      };

      const containerOffset = 20; // Container is 20px from screen left
      const result = calculateTooltipDimensions(
        edgeLayout,
        'Test',
        false,
        undefined,
        containerOffset,
      );

      // effectiveScreenMargin = max(0, 16 - 20) = 0
      // Tooltip can position at container edge since container already has margin
      expect(result.tooltipLeft).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative container offset (edge case)', () => {
      const layout: TooltipLayout = {
        x: 25,
        y: 200,
        width: 50,
        height: 30,
      };

      const containerOffset = -5; // Unusual but possible edge case
      const result = calculateTooltipDimensions(layout, 'Test', false, undefined, containerOffset);

      // containerOffset is now deprecated and ignored
      // effectiveScreenMargin is always SCREEN_MARGIN (16px)
      expect(result.tooltipLeft).toBeGreaterThanOrEqual(16);
    });

    it('should use container width when provided', () => {
      const layout: TooltipLayout = {
        x: 300, // Near right edge (container-relative)
        y: 200,
        width: 50,
        height: 30,
      };

      const containerOffset = 10;
      const containerWidth = 350; // Container is 350px wide (has 15px right margin)
      const result = calculateTooltipDimensions(
        layout,
        'Test',
        false,
        undefined,
        containerOffset,
        containerWidth,
      );

      // With containerWidth=350, right boundary should be at 350 - 16 = 334px
      // Tooltip should not exceed this boundary
      const rightEdge = result.tooltipLeft + result.tooltipWidth;
      expect(rightEdge).toBeLessThanOrEqual(334);
    });

    it('should handle container with right padding', () => {
      const layout: TooltipLayout = {
        x: 280, // Near right edge
        y: 200,
        width: 50,
        height: 30,
      };

      const containerOffset = 20; // 20px left margin
      const containerWidth = 335; // Container is 335px wide (screen 375 - 20 left - 20 right)
      const result = calculateTooltipDimensions(
        layout,
        'Long text for tooltip',
        false,
        undefined,
        containerOffset,
        containerWidth,
      );

      // Right boundary at containerWidth - SCREEN_MARGIN = 335 - 16 = 319px
      const rightEdge = result.tooltipLeft + result.tooltipWidth;
      expect(rightEdge).toBeLessThanOrEqual(319);
    });

    it('should fallback to calculated width when containerWidth is 0', () => {
      const layout: TooltipLayout = {
        x: 300,
        y: 200,
        width: 50,
        height: 30,
      };

      const containerOffset = 10;
      const containerWidth = 0; // Not provided
      const result = calculateTooltipDimensions(
        layout,
        'Test',
        false,
        undefined,
        containerOffset,
        containerWidth,
      );

      // containerOffset is now deprecated and ignored
      // When containerWidth is 0, falls back to SCREEN_WIDTH (375px)
      // Right boundary at 375 - 16 = 359px
      const rightEdge = result.tooltipLeft + result.tooltipWidth;
      expect(rightEdge).toBeLessThanOrEqual(359);
    });
  });
});
