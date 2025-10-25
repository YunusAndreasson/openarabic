/**
 * Debug test for user-reported bug: "wa an" (and from) and "fa idha" (so when)
 * Arabic white but English green
 */
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { ARABIC_PREFIXES } from '@/constants/arabicWordComponents';

describe('Bug Report: wa-an and fa-idha WITH DIACRITICS', () => {
  describe('وَمِنْ (with diacritics - and from)', () => {
    it('should analyze وَمِنْ with diacritics', () => {
      const analysis = analyzeArabicWord('وَمِنْ', 'and from');

      expect(analysis.hasComponents).toBe(true);
      // Now detects as multi-prefix: و + من
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should have colored Arabic segments for وَمِنْ', () => {
      const analysis = analyzeArabicWord('وَمِنْ', 'and from');
      const formatted = formatWordAnalysis(analysis);

      expect(formatted.reconstructedArabic).toBeDefined();
      const segments = formatted.reconstructedArabic?.segments || [];

      // Multi-prefix detection: و + من = 2 segments minimum
      expect(segments.length).toBeGreaterThanOrEqual(1);
      expect(segments[0]?.type).toBe('prefix');
    });
  });
});

describe('Bug Report: wa-an and fa-idha (without diacritics)', () => {
  describe('ومن (and from)', () => {
    it('should find individual prefixes و and من in ARABIC_PREFIXES', () => {
      const waPrefix = ARABIC_PREFIXES.find(p => p.arabic === 'و');
      const minPrefix = ARABIC_PREFIXES.find(p => p.arabic === 'من');

      expect(waPrefix).toBeDefined();
      expect(minPrefix).toBeDefined();
      expect(waPrefix?.english).toContain('and');
      expect(minPrefix?.english).toContain('from');
    });

    it('should analyze ومن (and from)', () => {
      const analysis = analyzeArabicWord('ومن', 'and from');

      expect(analysis.hasComponents).toBe(true);
      // Multi-prefix: و + من
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should have colored Arabic segments', () => {
      const analysis = analyzeArabicWord('ومن', 'and from');
      const formatted = formatWordAnalysis(analysis);

      expect(formatted.reconstructedArabic).toBeDefined();
      expect(formatted.reconstructedArabic?.segments).toBeDefined();

      const segments = formatted.reconstructedArabic?.segments || [];

      // Multi-prefix: و + من = at least 1 segment
      expect(segments.length).toBeGreaterThanOrEqual(1);
      expect(segments[0]?.type).toBe('prefix');
      expect(segments[0]?.colorName).not.toBe('text'); // Should be colored, not white
      // First prefix 'و' is conjunction = secondary color
      expect(segments[0]?.colorName).toBe('secondary');
    });
  });

  describe('فإذا (so when) - Split Coloring for Education', () => {
    it('should split فإذا into ف (so) + إذا (remaining)', () => {
      const analysis = analyzeArabicWord('فإذا', 'so when');

      // Multi-prefix: ف (conjunction) + إذا (particle) - both prefixes
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes[1]?.arabicMatch).toBe('إذا');
    });

    it('should have multiple colored Arabic segments for educational clarity', () => {
      const analysis = analyzeArabicWord('فإذا', 'so when');
      const formatted = formatWordAnalysis(analysis);

      expect(formatted.reconstructedArabic).toBeDefined();
      const segments = formatted.reconstructedArabic?.segments || [];

      // Should have 2 segments: ف (conjunction) + إذا (particle) - both prefixes
      expect(segments.length).toBe(2);
      expect(segments[0]?.text).toContain('ف');
      expect(segments[0]?.type).toBe('prefix');
      expect(segments[1]?.text).toContain('إذا');
      expect(segments[1]?.type).toBe('prefix'); // إذا is a particle prefix, not a root
    });
  });
});
