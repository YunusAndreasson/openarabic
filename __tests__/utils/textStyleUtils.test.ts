import {
  TEXT_STYLE_CONSTANTS,
  calculateDynamicPadding,
  createTextStyle,
  createTextStyleBase,
  determineTextColor,
  getSelectedStyle,
  type BatchedTextColors,
  type MeaningOverlayColors,
} from '@/utils/textStyleUtils';

describe('textStyleUtils', () => {
  const mockFontSize = 20;
  const mockColors: BatchedTextColors = {
    arabicText: '#000000',
    shadow: '#666666',
    englishText: '#333333',
  };
  const mockMeaningOverlayColors: MeaningOverlayColors = {
    warning: '#FFA500',
    error: '#FF0000',
    text: '#000000',
  };
  const mockUnderlineColor = '#9AB5A4'; // Soft disabled color for all underlines

  describe('TEXT_STYLE_CONSTANTS', () => {
    it('should have correct constant values', () => {
      expect(TEXT_STYLE_CONSTANTS.PADDING_TOP_RATIO).toBe(0.15);
      expect(TEXT_STYLE_CONSTANTS.PADDING_BOTTOM_RATIO).toBe(0.05);
    });
  });

  describe('calculateDynamicPadding', () => {
    it('should calculate padding correctly with default ratios', () => {
      const result = calculateDynamicPadding(mockFontSize);
      expect(result.paddingTop).toBe(mockFontSize * 0.15);
      expect(result.paddingBottom).toBe(mockFontSize * 0.05);
    });

    it('should handle zero font size', () => {
      const result = calculateDynamicPadding(0);
      expect(result.paddingTop).toBe(0);
      expect(result.paddingBottom).toBe(0);
    });
  });

  describe('createTextStyleBase', () => {
    it('should create base style with correct properties', () => {
      const result = createTextStyleBase(mockFontSize);

      expect(result).toHaveProperty('fontWeight', '700');
      expect(result).toHaveProperty('textAlign', 'center');
      expect(result).toHaveProperty('includeFontPadding', false);
      expect(result).toHaveProperty('textAlignVertical', 'center');
      expect(result).toHaveProperty('paddingTop', mockFontSize * 0.15);
      expect(result).toHaveProperty('paddingBottom', mockFontSize * 0.05);
    });
  });

  describe('createTextStyle', () => {
    it('should create complete text style with colors and elevation', () => {
      const result = createTextStyle(mockFontSize, mockColors);

      expect(result).toHaveProperty('color', mockColors.arabicText);
      expect(result).toHaveProperty('fontWeight', '700');
      expect(result).toHaveProperty('textAlign', 'center');
      expect(result).toHaveProperty('shadowColor', mockColors.shadow);
    });
  });

  describe('determineTextColor', () => {
    it('should return warning color for vague meaning', () => {
      const result = determineTextColor(true, false, false, mockMeaningOverlayColors);
      expect(result).toBe(mockMeaningOverlayColors.warning);
    });

    it('should return error color for struggling word', () => {
      const result = determineTextColor(false, false, true, mockMeaningOverlayColors);
      expect(result).toBe(mockMeaningOverlayColors.error);
    });

    it('should return default text color for normal state', () => {
      const result = determineTextColor(false, false, false, mockMeaningOverlayColors);
      expect(result).toBe(mockMeaningOverlayColors.text);
    });
  });

  describe('getSelectedStyle', () => {
    it('should return soft underline for selected words', () => {
      const result = getSelectedStyle(true, mockUnderlineColor);
      expect(result).toHaveProperty('borderBottomWidth', 1);
      expect(result).toHaveProperty('borderBottomColor', mockUnderlineColor);
    });

    it('should return empty object for unselected words', () => {
      const result = getSelectedStyle(false, mockUnderlineColor);
      expect(result).toEqual({});
    });

    it('should use the provided color exactly', () => {
      const customColor = '#FF0000';
      const result = getSelectedStyle(true, customColor);
      expect(result).toHaveProperty('borderBottomColor', customColor);
    });
  });
});
