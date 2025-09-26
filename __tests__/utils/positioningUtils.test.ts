import {
  TOOLTIP_CONSTANTS,
  calculateArrowPosition,
  calculateTooltipDimensions,
  handleScreenBoundaries,
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
  });

  describe('calculateArrowPosition', () => {
    it('should calculate arrow position correctly', () => {
      const result = calculateArrowPosition(100, 50, 100, 6);
      expect(result).toBe(50); // 100 - 50
    });

    it('should clamp arrow position to minimum', () => {
      const result = calculateArrowPosition(10, 50, 100, 6);
      expect(result).toBe(6); // Clamped to arrow size
    });

    it('should clamp arrow position to maximum', () => {
      const result = calculateArrowPosition(200, 50, 100, 6);
      expect(result).toBe(94); // 100 - 6 (clamped to max)
    });
  });

  describe('handleScreenBoundaries', () => {
    it('should return original position when within bounds', () => {
      const result = handleScreenBoundaries(100, 50, 16);
      expect(result).toBe(100);
    });

    it('should adjust position when too close to left edge', () => {
      const result = handleScreenBoundaries(5, 50, 16);
      expect(result).toBe(16);
    });

    it('should adjust position when too close to right edge', () => {
      // SCREEN_WIDTH defaults to 375 in test environments
      const screenWidth = 375;
      const result = handleScreenBoundaries(350, 50, 16);
      expect(result).toBe(screenWidth - 16 - 50); // SCREEN_WIDTH - margin - width
    });
  });
});
