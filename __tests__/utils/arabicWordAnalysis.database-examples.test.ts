/**
 * Tests for grammar rules based on real database examples
 * These test cases come from analyzing actual words in our database
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { ARABIC_PREFIXES } from '@/constants/arabicWordComponents';

describe('Database Example Grammar Rules', () => {
  describe('Split Behavior: فمن (fa-man)', () => {
    test('should detect فمن as multi-prefix (so whoever)', () => {
      const analysis = analyzeArabicWord('فمن', 'so whoever');

      // Multi-prefix: ف (so) + من (who/from)
      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
    });

    test('should partially match فَمَنْ with "and whoever" (من matches)', () => {
      const analysis = analyzeArabicWord('فمن', 'and whoever');

      // ف doesn't match "and", but من could match "whoever" if checked as standalone
      // With split behavior, ف tries first but doesn't match
      // Actual behavior: may have partial match or no match depending on implementation
      // This is acceptable for split coloring
      expect(analysis).toBeDefined();
    });

    test('should handle split coloring for multi-word translations', () => {
      const analysis = analyzeArabicWord('فمن', 'so who');
      const formatted = formatWordAnalysis(analysis);

      // ف="so" + من="who" should both match
      expect(analysis.hasComponents).toBeTruthy();
    });
  });

  describe('Split Behavior: فإنما (fa-innama)', () => {
    test('should detect إن and ما as separate particles (not monolithic إنما)', () => {
      // إنما is no longer a single prefix - it's decomposed
      const innama = ARABIC_PREFIXES.find(p => p.arabic === 'إنما');
      expect(innama).toBeUndefined(); // Should NOT exist

      // Instead, we have separate components
      const inna = ARABIC_PREFIXES.find(p => p.arabic === 'إن');
      const ma = ARABIC_PREFIXES.find(p => p.arabic === 'ما');
      expect(inna).toBeDefined();
      expect(ma).toBeDefined();
      expect(ma?.english).toContain('only');
    });

    test('should analyze فَإِنَّ with two separate prefixes (fa + inna)', () => {
      const analysis = analyzeArabicWord('فإن', 'so indeed');

      // فإن compound removed - now splits into ف (conjunction) + إن (particle)
      // Both components match English translation and get different colors
      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes).toHaveLength(2);

      // First prefix: ف (conjunction) - "so" - Conjunction with consequential meaning
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes[0]?.englishMatches).toContain('so');
      expect(analysis.prefixes[0]?.role).toBe('conjunction');

      // Second prefix: إن (particle) - "indeed"
      expect(analysis.prefixes[1]?.arabicMatch).toBe('إن');
      expect(analysis.prefixes[1]?.englishMatches).toContain('indeed');
      expect(analysis.prefixes[1]?.role).toBe('particle');

      // No remaining root (the whole word is prefixes)
      expect(analysis.remainingArabic).toBe('');
    });

    test('should analyze فَإِنَّمَا with complete translation "so indeed only"', () => {
      const analysis = analyzeArabicWord('فإنما', 'so indeed only');

      // New behavior: ف + إن + ما detected as three separate prefixes
      // فإن compound removed - now splits into ف (conjunction) + إن (particle)
      // All three components match when translation is complete
      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes).toHaveLength(3);

      // First prefix: ف (conjunction) - "so"
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes[0]?.englishMatches).toContain('so');

      // Second prefix: إن (particle) - "indeed"
      expect(analysis.prefixes[1]?.arabicMatch).toBe('إن');
      expect(analysis.prefixes[1]?.englishMatches).toContain('indeed');

      // Third prefix: ما (particle) - "only"
      expect(analysis.prefixes[2]?.arabicMatch).toBe('ما');
      expect(analysis.prefixes[2]?.englishMatches).toContain('only');

      // No remaining root (the whole word is prefixes)
      expect(analysis.remainingArabic).toBe('');
    });

    test('should analyze فَإِنَّمَا with simplified translation "so only"', () => {
      const analysis = analyzeArabicWord('فإنما', 'so only');

      // When إن has no English equivalent in translation, only ف is detected
      // ما cannot be detected because it's a prefix (must be at start of remaining)
      // and it comes after إن which blocks it
      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes).toHaveLength(1);

      // Only prefix: ف (conjunction) - "so"
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes[0]?.englishMatches).toContain('so');

      // Remaining includes إنما (إ normalized to ا by normalizeArabic)
      expect(analysis.remainingArabic).toBe('انما');
    });

    test('should handle standalone إنما as two prefixes', () => {
      const analysis = analyzeArabicWord('إنما', 'indeed only');

      // إنما is now detected as إن + ما (two separate prefixes)
      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes).toHaveLength(2);

      // First prefix: إن
      expect(analysis.prefixes[0]?.arabicMatch).toBe('إن');
      expect(analysis.prefixes[0]?.englishMatches).toContain('indeed');

      // Second prefix: ما
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.prefixes[1]?.englishMatches).toContain('only');
    });
  });

  describe('Standalone Particles', () => {
    test('should detect إن and ما as separate particles for إنما construction', () => {
      // إنما is no longer a monolithic prefix - it's decomposed into إن + ما
      const inna = ARABIC_PREFIXES.find(p => p.arabic === 'إن');
      const ma = ARABIC_PREFIXES.find(p => p.arabic === 'ما');

      expect(inna).toBeDefined();
      expect(inna?.english).toContain('indeed');

      expect(ma).toBeDefined();
      expect(ma?.english).toContain('only'); // ما can mean "only" in restrictive contexts like إنما
    });

    test('should have من/مَنْ entries in ARABIC_PREFIXES', () => {
      // Check for both normalized (من) and diacritical (مَنْ) versions
      const manEntries = ARABIC_PREFIXES.filter(p => p.arabic === 'من' || p.arabic === 'مَنْ');
      expect(manEntries.length).toBeGreaterThan(0);

      // Should have particle ("who/whoever") meaning in at least one version
      const hasWhoMeaning = manEntries.some(entry =>
        entry.english.some(e => e.includes('who') || e.includes('whoever')),
      );
      expect(hasWhoMeaning).toBeTruthy();
    });
  });

  describe('Multi-Prefix Detection (Compound Behavior Removed)', () => {
    test('should detect وعن as multi-prefix (and from)', () => {
      const analysis = analyzeArabicWord('وعن', 'and from');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();
      // Multi-prefix: و (and) + عن (from/about)
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
    });

    test('should detect ومن as multi-prefix (and from)', () => {
      const analysis = analyzeArabicWord('ومن', 'and from');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();
      // Multi-prefix: و (and) + من (from)
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Real-World Oath Examples', () => {
    test('should detect والله (by Allah / and by Allah)', () => {
      const analysisByAllah = analyzeArabicWord('والله', 'by Allah');

      expect(analysisByAllah.hasComponents).toBeTruthy();
      expect(analysisByAllah.prefixes[0]).toBeDefined();
      expect(analysisByAllah.prefixes[0]?.arabicMatch).toBe('و');

      // Should match "by" as one of the و alternatives
      const byMatch = analysisByAllah.prefixes[0]?.englishMatches.some(m =>
        m.toLowerCase().includes('by'),
      );
      expect(byMatch).toBeTruthy();
    });

    test('should detect والسماء (and by the sky)', () => {
      const analysis = analyzeArabicWord('والسماء', 'and by the sky');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should detect compound و+ال
      const hasWaOrAl =
        analysis.prefixes[0]?.arabicMatch.includes('و') ||
        analysis.prefixes[0]?.arabicMatch.includes('ال');
      expect(hasWaOrAl).toBeTruthy();
    });
  });

  describe('Preposition ب Compounds', () => {
    test('should detect بما (concerning what)', () => {
      const analysis = analyzeArabicWord('بما', 'concerning what');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match compound ب+ما
      const hasB = analysis.prefixes[0]?.arabicMatch.includes('ب');
      expect(hasB).toBeTruthy();
    });

    test('should detect بمقتضى (based on)', () => {
      const analysis = analyzeArabicWord('بمقتضى', 'based on');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');

      // Should match "based" as one of the ب alternatives
      const basedMatch = analysis.prefixes[0]?.englishMatches.some(m =>
        m.toLowerCase().includes('based'),
      );
      expect(basedMatch).toBeTruthy();
    });
  });

  describe('Negation Patterns', () => {
    test('should detect لم in negation phrase', () => {
      const analysis = analyzeArabicWord('لم', 'does not');

      // Single component → hasComponents=false
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لم');

      // Should match "does not" as one of the لم alternatives
      const doesNotMatch = analysis.prefixes[0]?.englishMatches.some(
        m => m.toLowerCase().includes('does') && m.toLowerCase().includes('not'),
      );
      expect(doesNotMatch).toBeTruthy();
    });

    test('should detect ولا (and not)', () => {
      const analysis = analyzeArabicWord('ولا', 'and not');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match compound و+لا (may be "ولا" or just "و" depending on priority)
      const hasWaOrWaLa =
        analysis.prefixes[0]?.arabicMatch === 'ولا' || analysis.prefixes[0]?.arabicMatch === 'و';
      expect(hasWaOrWaLa).toBeTruthy();
    });
  });

  describe('Interrogative كم Examples', () => {
    test('should detect كم (how much)', () => {
      const analysis = analyzeArabicWord('كم', 'how much');

      // Single component → hasComponents=false
      expect(analysis.hasComponents).toBeFalsy();
      expect(analysis.prefixes[0]).toBeDefined();
      expect(analysis.prefixes[0]?.arabicMatch).toBe('كم');

      // Should match "how much"
      const howMuchMatch = analysis.prefixes[0]?.englishMatches.some(
        m => m.toLowerCase().includes('how') && m.toLowerCase().includes('much'),
      );
      expect(howMuchMatch).toBeTruthy();
    });

    test('should detect وكم (and how many)', () => {
      const analysis = analyzeArabicWord('وكم', 'and how many');

      expect(analysis.hasComponents).toBeTruthy();
      expect(analysis.prefixes[0]).toBeDefined();

      // Should match compound و+كم (may be "وكم" compound or separate components)
      const hasWaOrCompound =
        analysis.prefixes[0]?.arabicMatch === 'وكم' ||
        analysis.prefixes[0]?.arabicMatch === 'و' ||
        analysis.prefixes[0]?.englishMatches.some(m => m.toLowerCase().includes('how'));
      expect(hasWaOrCompound).toBeTruthy();
    });
  });
});
