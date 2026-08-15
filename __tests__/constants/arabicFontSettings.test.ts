import { ARABIC_FONT_NAMES, FONTS, resolveArabicFont } from '@/constants/fonts';
import { ARABIC_FONT_SIZE, clampArabicFontSize } from '@/constants/layout';
import settingsReducer, { setArabicFontSize } from '@/store/settingsSlice';

/**
 * The Arabic reading settings are persisted by redux-persist with no migration
 * step, so whatever is in storage is handed straight to the renderers. These
 * guard the two narrowing functions every reader goes through.
 */
describe('Arabic font settings', () => {
  describe('clampArabicFontSize', () => {
    it('keeps a size inside the supported range', () => {
      expect(clampArabicFontSize(ARABIC_FONT_SIZE.MIN)).toBe(ARABIC_FONT_SIZE.MIN);
      expect(clampArabicFontSize(ARABIC_FONT_SIZE.MAX)).toBe(ARABIC_FONT_SIZE.MAX);
      expect(clampArabicFontSize(24)).toBe(24);
    });

    it('pulls a size from an older build back into range', () => {
      // 13 was the floor before the English body size became the minimum.
      expect(clampArabicFontSize(13)).toBe(ARABIC_FONT_SIZE.MIN);
      expect(clampArabicFontSize(400)).toBe(ARABIC_FONT_SIZE.MAX);
    });

    it('falls back to the default for a value that is not a usable number', () => {
      expect(clampArabicFontSize(undefined)).toBe(ARABIC_FONT_SIZE.DEFAULT);
      expect(clampArabicFontSize(null)).toBe(ARABIC_FONT_SIZE.DEFAULT);
      expect(clampArabicFontSize(NaN)).toBe(ARABIC_FONT_SIZE.DEFAULT);
      expect(clampArabicFontSize(Infinity)).toBe(ARABIC_FONT_SIZE.DEFAULT);
    });

    it('rounds to whole points, since the slider steps by one', () => {
      expect(clampArabicFontSize(24.4)).toBe(24);
      expect(clampArabicFontSize(24.6)).toBe(25);
    });

    it('never lets Arabic set smaller than the English translation beneath it', () => {
      expect(ARABIC_FONT_SIZE.MIN).toBeGreaterThanOrEqual(16);
    });

    it('is applied by the reducer, not only by the picker', () => {
      const state = settingsReducer(undefined, setArabicFontSize(999));
      expect(state.arabicFontSize).toBe(ARABIC_FONT_SIZE.MAX);
    });
  });

  describe('resolveArabicFont', () => {
    it('passes through every face the app ships', () => {
      for (const name of ARABIC_FONT_NAMES) {
        expect(resolveArabicFont(name)).toBe(name);
      }
    });

    it('falls back to the default face for a name the app no longer ships', () => {
      expect(resolveArabicFont('RemovedInV2-Regular')).toBe(FONTS.ARABIC);
      expect(resolveArabicFont(undefined)).toBe(FONTS.ARABIC);
      expect(resolveArabicFont(42)).toBe(FONTS.ARABIC);
    });

    it('resolves to a face the picker can mark as selected', () => {
      expect(ARABIC_FONT_NAMES).toContain(resolveArabicFont('nonsense'));
    });
  });
});
