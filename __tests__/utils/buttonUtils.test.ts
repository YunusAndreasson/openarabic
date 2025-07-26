import {
  FLOATING_ACTION_BUTTON_CONSTANTS,
  calculateButtonPositions,
  createAccessibilityLabel,
  createActiveButtonStyle,
  createButtonStyle,
  createRippleConfig,
  getIconColor,
  getIconName,
} from '@/utils/buttonUtils';

// Mock theme colors for testing
const mockColors = {
  elevation1: '#f0f0f0',
  elevation2: '#e0e0e0',
  tint: '#007AFF',
  secondaryText: '#666666',
} as any;

describe('Button Utilities', () => {
  describe('FLOATING_ACTION_BUTTON_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_SIZE).toBe(44); // MIN_TOUCH_TARGET.MEDIUM
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_RADIUS).toBe(22); // BUTTON_SIZE / 2
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.RIPPLE_RADIUS).toBe(22); // BUTTON_SIZE / 2
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.ICON_SIZE).toBe(20); // LAYOUT.BUTTON.ICON_SIZE.MEDIUM
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.SPACING).toBe(8); // LAYOUT.SPACING.SMALL
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.TOP_MARGIN).toBe(8); // LAYOUT.SPACING.SMALL
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.SIDE_MARGIN).toBe(8); // LAYOUT.SPACING.SMALL
      expect(FLOATING_ACTION_BUTTON_CONSTANTS.Z_INDEX).toBe(4); // LAYOUT.Z_INDEX.OVERLAY
    });
  });

  describe('createButtonStyle', () => {
    it('should create button style for dark mode', () => {
      const result = createButtonStyle(mockColors, true);

      expect(result.width).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_SIZE);
      expect(result.height).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_SIZE);
      expect(result.borderRadius).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.BUTTON_RADIUS);
      expect(result.backgroundColor).toBe(mockColors.elevation1);
      expect(result.opacity).toBe(0.7);
      expect(result.alignItems).toBe('center');
      expect(result.justifyContent).toBe('center');
    });

    it('should create button style for light mode', () => {
      const result = createButtonStyle(mockColors, false);

      expect(result.opacity).toBe(0.45);
      expect(result.backgroundColor).toBe(mockColors.elevation1);
    });
  });

  describe('createActiveButtonStyle', () => {
    it('should create active button style for dark mode', () => {
      const baseStyle = createButtonStyle(mockColors, true);
      const result = createActiveButtonStyle(baseStyle, mockColors, true);

      expect(result.backgroundColor).toBe(mockColors.elevation2);
      expect(result.opacity).toBe(0.85);
      expect(result.width).toBe(baseStyle.width);
      expect(result.height).toBe(baseStyle.height);
    });

    it('should create active button style for light mode', () => {
      const baseStyle = createButtonStyle(mockColors, false);
      const result = createActiveButtonStyle(baseStyle, mockColors, false);

      expect(result.backgroundColor).toBe(mockColors.elevation2);
      expect(result.opacity).toBe(0.6);
    });
  });

  describe('calculateButtonPositions', () => {
    it('should calculate button positions correctly', () => {
      const topInset = 50;
      const result = calculateButtonPositions(topInset);

      const expectedTop = topInset + FLOATING_ACTION_BUTTON_CONSTANTS.TOP_MARGIN;

      expect(result.closeButtonStyle.position).toBe('absolute');
      expect(result.closeButtonStyle.top).toBe(expectedTop);
      expect(result.closeButtonStyle.left).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.SIDE_MARGIN);
      expect(result.closeButtonStyle.zIndex).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.Z_INDEX);

      expect(result.actionButtonsStyle.position).toBe('absolute');
      expect(result.actionButtonsStyle.top).toBe(expectedTop);
      expect(result.actionButtonsStyle.right).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.SIDE_MARGIN);
      expect(result.actionButtonsStyle.zIndex).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.Z_INDEX);
      expect(result.actionButtonsStyle.flexDirection).toBe('row');
      expect(result.actionButtonsStyle.gap).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.SPACING);
    });

    it('should handle zero top inset', () => {
      const result = calculateButtonPositions(0);
      expect(result.closeButtonStyle.top).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.TOP_MARGIN);
      expect(result.actionButtonsStyle.top).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.TOP_MARGIN);
    });
  });

  describe('createRippleConfig', () => {
    it('should create ripple configuration correctly', () => {
      const result = createRippleConfig(mockColors);

      expect(result.color).toBe(mockColors.tint);
      expect(result.radius).toBe(FLOATING_ACTION_BUTTON_CONSTANTS.RIPPLE_RADIUS);
    });
  });

  describe('getIconColor', () => {
    it('should return tint color for active state', () => {
      const result = getIconColor(true, mockColors);
      expect(result).toBe(mockColors.tint);
    });

    it('should return secondary text color for inactive state', () => {
      const result = getIconColor(false, mockColors);
      expect(result).toBe(mockColors.secondaryText);
    });
  });

  describe('createAccessibilityLabel', () => {
    it('should create correct labels for close button', () => {
      expect(createAccessibilityLabel('close', false)).toBe('Close article');
      expect(createAccessibilityLabel('close', true)).toBe('Close article');
    });

    it('should create correct labels for playlist button', () => {
      expect(createAccessibilityLabel('playlist', false)).toBe('Add to listening list');
      expect(createAccessibilityLabel('playlist', true)).toBe('Remove from listening list');
    });

    it('should create correct labels for play button', () => {
      expect(createAccessibilityLabel('play', false)).toBe('Start audio playback');
      expect(createAccessibilityLabel('play', true)).toBe('Stop audio playback');
    });
  });

  describe('getIconName', () => {
    it('should return correct icon names for close button', () => {
      expect(getIconName('close', false)).toBe('close');
      expect(getIconName('close', true)).toBe('close');
    });

    it('should return correct icon names for playlist button', () => {
      expect(getIconName('playlist', false)).toBe('headset-outline');
      expect(getIconName('playlist', true)).toBe('headset');
    });

    it('should return correct icon names for play button', () => {
      expect(getIconName('play', false)).toBe('play');
      expect(getIconName('play', true)).toBe('stop');
    });
  });
});
