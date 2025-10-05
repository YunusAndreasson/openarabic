import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import type { ThemeColors } from '@/types/ui/theme.types';
import {
  COMMON_STYLES,
  createAndroidRipple,
  createContainerStyle,
  createMargin,
  createPadding,
} from '@/utils/layoutUtils';

describe('layoutUtils', () => {
  describe('createPadding', () => {
    it('should create padding with all option', () => {
      const result = createPadding({ all: 'MEDIUM' });
      expect(result).toEqual({ padding: LAYOUT.SPACING.MEDIUM });
    });

    it('should create padding with horizontal option', () => {
      const result = createPadding({ horizontal: 'LARGE' });
      expect(result).toEqual({ paddingHorizontal: LAYOUT.SPACING.LARGE });
    });

    it('should create padding with vertical option', () => {
      const result = createPadding({ vertical: 'SMALL' });
      expect(result).toEqual({ paddingVertical: LAYOUT.SPACING.SMALL });
    });

    it('should create padding with top option', () => {
      const result = createPadding({ top: 'XLARGE' });
      expect(result).toEqual({ paddingTop: LAYOUT.SPACING.XLARGE });
    });

    it('should create padding with bottom option', () => {
      const result = createPadding({ bottom: 'TINY' });
      expect(result).toEqual({ paddingBottom: LAYOUT.SPACING.TINY });
    });

    it('should create padding with left option', () => {
      const result = createPadding({ left: 'MEDIUM' });
      expect(result).toEqual({ paddingLeft: LAYOUT.SPACING.MEDIUM });
    });

    it('should create padding with right option', () => {
      const result = createPadding({ right: 'LARGE' });
      expect(result).toEqual({ paddingRight: LAYOUT.SPACING.LARGE });
    });

    it('should combine multiple padding options', () => {
      const result = createPadding({
        horizontal: 'MEDIUM',
        vertical: 'SMALL',
      });
      expect(result).toEqual({
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        paddingVertical: LAYOUT.SPACING.SMALL,
      });
    });

    it('should combine specific directional padding', () => {
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

    it('should prioritize all option over other options', () => {
      const result = createPadding({
        all: 'MEDIUM',
        horizontal: 'LARGE', // Should be ignored
      });
      expect(result).toEqual({ padding: LAYOUT.SPACING.MEDIUM });
    });
  });

  describe('createMargin', () => {
    it('should create margin with all option', () => {
      const result = createMargin({ all: 'MEDIUM' });
      expect(result).toEqual({ margin: LAYOUT.SPACING.MEDIUM });
    });

    it('should create margin with horizontal option', () => {
      const result = createMargin({ horizontal: 'LARGE' });
      expect(result).toEqual({ marginHorizontal: LAYOUT.SPACING.LARGE });
    });

    it('should create margin with vertical option', () => {
      const result = createMargin({ vertical: 'SMALL' });
      expect(result).toEqual({ marginVertical: LAYOUT.SPACING.SMALL });
    });

    it('should create margin with top option', () => {
      const result = createMargin({ top: 'XLARGE' });
      expect(result).toEqual({ marginTop: LAYOUT.SPACING.XLARGE });
    });

    it('should create margin with bottom option', () => {
      const result = createMargin({ bottom: 'TINY' });
      expect(result).toEqual({ marginBottom: LAYOUT.SPACING.TINY });
    });

    it('should create margin with left option', () => {
      const result = createMargin({ left: 'MEDIUM' });
      expect(result).toEqual({ marginLeft: LAYOUT.SPACING.MEDIUM });
    });

    it('should create margin with right option', () => {
      const result = createMargin({ right: 'LARGE' });
      expect(result).toEqual({ marginRight: LAYOUT.SPACING.LARGE });
    });

    it('should combine multiple margin options', () => {
      const result = createMargin({
        horizontal: 'MEDIUM',
        vertical: 'SMALL',
      });
      expect(result).toEqual({
        marginHorizontal: LAYOUT.SPACING.MEDIUM,
        marginVertical: LAYOUT.SPACING.SMALL,
      });
    });

    it('should combine specific directional margin', () => {
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

    it('should prioritize all option over other options', () => {
      const result = createMargin({
        all: 'MEDIUM',
        horizontal: 'LARGE', // Should be ignored
      });
      expect(result).toEqual({ margin: LAYOUT.SPACING.MEDIUM });
    });
  });

  describe('createContainerStyle', () => {
    it('should create empty style with no options', () => {
      const result = createContainerStyle({});
      expect(result).toEqual({});
    });

    it('should create style with padding', () => {
      const result = createContainerStyle({
        padding: { all: 'MEDIUM' },
      });
      expect(result).toEqual({ padding: LAYOUT.SPACING.MEDIUM });
    });

    it('should create style with margin', () => {
      const result = createContainerStyle({
        margin: { horizontal: 'LARGE' },
      });
      expect(result).toEqual({ marginHorizontal: LAYOUT.SPACING.LARGE });
    });

    it('should create centered container', () => {
      const result = createContainerStyle({
        centered: true,
      });
      expect(result).toEqual({
        alignItems: 'center',
        justifyContent: 'center',
      });
    });

    it('should create full width container', () => {
      const result = createContainerStyle({
        fullWidth: true,
      });
      expect(result).toEqual({ width: '100%' });
    });

    it('should combine all options', () => {
      const result = createContainerStyle({
        padding: { all: 'MEDIUM' },
        margin: { horizontal: 'LARGE' },
        centered: true,
        fullWidth: true,
      });
      expect(result).toEqual({
        padding: LAYOUT.SPACING.MEDIUM,
        marginHorizontal: LAYOUT.SPACING.LARGE,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      });
    });

    it('should handle complex padding and margin options', () => {
      const result = createContainerStyle({
        padding: { horizontal: 'MEDIUM', vertical: 'SMALL' },
        margin: { top: 'LARGE', bottom: 'TINY' },
      });
      expect(result).toEqual({
        paddingHorizontal: LAYOUT.SPACING.MEDIUM,
        paddingVertical: LAYOUT.SPACING.SMALL,
        marginTop: LAYOUT.SPACING.LARGE,
        marginBottom: LAYOUT.SPACING.TINY,
      });
    });
  });

  describe('createAndroidRipple', () => {
    const mockColors: ThemeColors = {
      navigationRipple: 'rgba(0, 0, 0, 0.1)',
    } as ThemeColors;

    it('should create small ripple', () => {
      const result = createAndroidRipple(mockColors, 'small');
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.SMALL / 2,
      });
    });

    it('should create medium ripple', () => {
      const result = createAndroidRipple(mockColors, 'medium');
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.MEDIUM / 2,
      });
    });

    it('should create large ripple', () => {
      const result = createAndroidRipple(mockColors, 'large');
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.LARGE / 2,
      });
    });

    it('should default to medium ripple', () => {
      const result = createAndroidRipple(mockColors);
      expect(result).toEqual({
        color: 'rgba(0, 0, 0, 0.1)',
        radius: MIN_TOUCH_TARGET.MEDIUM / 2,
      });
    });

    it('should use theme color from colors object', () => {
      const customColors: ThemeColors = {
        navigationRipple: 'rgba(255, 0, 0, 0.2)',
      } as ThemeColors;
      const result = createAndroidRipple(customColors, 'small');
      expect(result.color).toBe('rgba(255, 0, 0, 0.2)');
    });
  });

  describe('COMMON_STYLES', () => {
    it('should have correct row style', () => {
      expect(COMMON_STYLES.row).toEqual({
        flexDirection: 'row',
        alignItems: 'center',
      });
    });

    it('should have correct centeredRow style', () => {
      expect(COMMON_STYLES.centeredRow).toEqual({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      });
    });

    it('should have correct roundedMedium style', () => {
      expect(COMMON_STYLES.roundedMedium).toEqual({
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
      });
    });

    it('should have correct fullWidth style', () => {
      expect(COMMON_STYLES.fullWidth).toEqual({
        width: '100%',
      });
    });

    it('should have correct flex1 style', () => {
      expect(COMMON_STYLES.flex1).toEqual({
        flex: 1,
      });
    });
  });
});
