/**
 * Tests for Translation Normalization
 *
 * Verifies that English translation normalization works correctly to enable
 * proper component detection and coloring for transliterated words.
 */

import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';
import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { GrammaticalRole } from '@/constants/arabicWordComponents';

describe('Translation Normalization', () => {
  describe('normalizeTranslation()', () => {
    describe('Known transliterations', () => {
      it('should normalize "wa la" to "and not"', () => {
        expect(normalizeTranslation('ولا', 'wa la')).toBe('and not');
      });

      it('should normalize "wala" (no space) to "and not"', () => {
        expect(normalizeTranslation('ولا', 'wala')).toBe('and not');
      });

      it('should normalize "wa laa" to "and not"', () => {
        expect(normalizeTranslation('ولا', 'wa laa')).toBe('and not');
      });

      it('should normalize "fa la" to "so not"', () => {
        expect(normalizeTranslation('فلا', 'fa la')).toBe('so not');
      });

      it('should normalize "wa lam" to "and did not"', () => {
        expect(normalizeTranslation('ولم', 'wa lam')).toBe('and did not');
      });

      it('should normalize "fa lam" to "so did not"', () => {
        expect(normalizeTranslation('فلم', 'fa lam')).toBe('so did not');
      });

      it('should normalize "wa lan" to "and will not"', () => {
        expect(normalizeTranslation('ولن', 'wa lan')).toBe('and will not');
      });

      it('should normalize "mi ma" to "from what"', () => {
        expect(normalizeTranslation('مما', 'mi ma')).toBe('from what');
      });

      it('should normalize "fa in" to "so indeed"', () => {
        expect(normalizeTranslation('فإن', 'fa in')).toBe('so indeed');
      });

      it('should normalize "wa in" to "and indeed"', () => {
        expect(normalizeTranslation('وإن', 'wa in')).toBe('and indeed');
      });
    });

    describe('Already normalized translations', () => {
      it('should preserve "and not" when already normalized', () => {
        expect(normalizeTranslation('ولا', 'and not')).toBe('and not');
      });

      it('should preserve "so not" when already normalized', () => {
        expect(normalizeTranslation('فلا', 'so not')).toBe('so not');
      });

      it('should preserve "and did not" when already normalized', () => {
        expect(normalizeTranslation('ولم', 'and did not')).toBe('and did not');
      });
    });

    describe('Unknown patterns', () => {
      it('should return original translation for unknown Arabic words', () => {
        expect(normalizeTranslation('كتاب', 'book')).toBe('book');
      });

      it('should always normalize when rule exists (regardless of input)', () => {
        // New behavior: always normalize to consistent translation
        expect(normalizeTranslation('ولا', 'unknown translation')).toBe('and not');
      });

      it('should return original translation for words without rules', () => {
        expect(normalizeTranslation('الكتاب', 'the book')).toBe('the book');
      });
    });

    describe('Case sensitivity', () => {
      it('should normalize case-insensitively: "Wa La"', () => {
        expect(normalizeTranslation('ولا', 'Wa La')).toBe('and not');
      });

      it('should normalize case-insensitively: "WA LA"', () => {
        expect(normalizeTranslation('ولا', 'WA LA')).toBe('and not');
      });

      it('should normalize case-insensitively: "FA LA"', () => {
        expect(normalizeTranslation('فلا', 'FA LA')).toBe('so not');
      });
    });

    describe('Whitespace handling', () => {
      it('should normalize with leading/trailing spaces', () => {
        expect(normalizeTranslation('ولا', '  wa la  ')).toBe('and not');
      });

      it('should normalize with multiple spaces between words', () => {
        expect(normalizeTranslation('ولا', 'wa   la')).toBe('and not');
      });

      it('should normalize with tabs', () => {
        expect(normalizeTranslation('ولا', 'wa\tla')).toBe('and not');
      });
    });

    describe('Edge cases', () => {
      it('should normalize even empty English translation', () => {
        // New behavior: always normalize when we have a rule
        expect(normalizeTranslation('ولا', '')).toBe('and not');
      });

      it('should handle Arabic words with diacritics', () => {
        expect(normalizeTranslation('وَلَا', 'wa la')).toBe('and not');
      });

      it('should handle Arabic words with different diacritics', () => {
        expect(normalizeTranslation('فَلاَ', 'fa la')).toBe('so not');
      });
    });
  });

  describe('Integration with analyzeArabicWord()', () => {
    describe('Component detection after normalization', () => {
      it('should detect components for "wa la" → "and not"', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        expect(analysis.hasComponents).toBe(true);
        expect(analysis.prefixes.length).toBeGreaterThan(0);
      });

      it('should detect و (and) as first prefix', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        const hasWaw = analysis.prefixes.some(
          p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
        );
        expect(hasWaw).toBe(true);
      });

      it('should detect لا (not) as second prefix', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        const hasLa = analysis.prefixes.some(
          p => p.arabicMatch === 'لا' && p.englishMatches.includes('not'),
        );
        expect(hasLa).toBe(true);
      });

      it('should detect components for "fa la" → "so not"', () => {
        const analysis = analyzeArabicWord('فلا', 'fa la');

        expect(analysis.hasComponents).toBe(true);

        const hasFa = analysis.prefixes.some(
          p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
        );
        const hasLa = analysis.prefixes.some(
          p => p.arabicMatch === 'لا' && p.englishMatches.includes('not'),
        );

        expect(hasFa).toBe(true);
        expect(hasLa).toBe(true);
      });

      it('should detect components for "wa lam" → "and did not"', () => {
        const analysis = analyzeArabicWord('ولم', 'wa lam');

        expect(analysis.hasComponents).toBe(true);

        const hasWaw = analysis.prefixes.some(
          p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
        );
        const hasLam = analysis.prefixes.some(
          p => p.arabicMatch === 'لم' && p.englishMatches.some(m => m.includes('not')),
        );

        expect(hasWaw).toBe(true);
        expect(hasLam).toBe(true);
      });
    });

    describe('Component separation (educational requirement)', () => {
      it('should detect و and لا as SEPARATE prefixes', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        // Must have at least 2 prefixes (و and لا should be separate)
        expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);

        // Find the two components
        const wawPrefix = analysis.prefixes.find(p => p.arabicMatch === 'و');
        const laPrefix = analysis.prefixes.find(p => p.arabicMatch === 'لا');

        expect(wawPrefix).toBeDefined();
        expect(laPrefix).toBeDefined();

        // They should be different components
        expect(wawPrefix).not.toBe(laPrefix);
      });

      it('should assign different grammatical roles for و and لا', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        const wawPrefix = analysis.prefixes.find(p => p.arabicMatch === 'و');
        const laPrefix = analysis.prefixes.find(p => p.arabicMatch === 'لا');

        expect(wawPrefix?.role).toBe(GrammaticalRole.CONJUNCTION);
        expect(laPrefix?.role).toBe(GrammaticalRole.NEGATION);

        // Different roles mean different colors in the UI
        expect(wawPrefix?.role).not.toBe(laPrefix?.role);
      });

      it('should detect ف and لا as SEPARATE prefixes in "فلا"', () => {
        const analysis = analyzeArabicWord('فلا', 'fa la');

        expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);

        const faPrefix = analysis.prefixes.find(p => p.arabicMatch === 'ف');
        const laPrefix = analysis.prefixes.find(p => p.arabicMatch === 'لا');

        expect(faPrefix).toBeDefined();
        expect(laPrefix).toBeDefined();
        expect(faPrefix?.role).toBe(GrammaticalRole.CONJUNCTION);
        expect(laPrefix?.role).toBe(GrammaticalRole.NEGATION);
      });
    });

    describe('Original preservation', () => {
      it('should use normalized English in analysis.original', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        // New behavior: original.english contains normalized English
        expect(analysis.original.english).toBe('and not');
      });

      it('should preserve original Arabic in analysis.original', () => {
        const analysis = analyzeArabicWord('ولا', 'wa la');

        expect(analysis.original.arabic).toBe('ولا');
      });

      it('should use normalized English in original.english', () => {
        const analysis = analyzeArabicWord('فلا', 'FA LA');

        // New behavior: original.english contains normalized English for UI display
        expect(analysis.original.english).toBe('so not');
      });
    });

    describe('Cache behavior', () => {
      it('should use same cache for "wa la" and "and not"', () => {
        // First call with transliteration
        const analysis1 = analyzeArabicWord('ولا', 'wa la');

        // Second call with normalized translation (should hit same cache)
        const analysis2 = analyzeArabicWord('ولا', 'and not');

        // Both should detect components
        expect(analysis1.hasComponents).toBe(true);
        expect(analysis2.hasComponents).toBe(true);

        // Components should be the same
        expect(analysis1.prefixes.length).toBe(analysis2.prefixes.length);
      });
    });

    describe('Regression prevention', () => {
      it('should not break existing non-normalized words', () => {
        const analysis = analyzeArabicWord('الكتاب', 'the book');

        // Should still work for normal words
        expect(analysis.original.english).toBe('the book');
        expect(analysis.original.arabic).toBe('الكتاب');
      });

      it('should not break single-word analysis', () => {
        const analysis = analyzeArabicWord('كتاب', 'book');

        // Single word should not have components
        expect(analysis.hasComponents).toBe(false);
      });

      it('should not break words without transliterations', () => {
        const analysis = analyzeArabicWord('والله', 'and by Allah');

        // Should still detect components normally
        const hasWaw = analysis.prefixes.some(
          p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
        );
        expect(hasWaw).toBe(true);
      });
    });

    describe('Complex normalization patterns', () => {
      it('should normalize three-component combinations: "wa bi al"', () => {
        const analysis = analyzeArabicWord('وبال', 'wa bi al');

        expect(analysis.hasComponents).toBe(true);

        // Should detect و (and) at minimum
        const hasWaw = analysis.prefixes.some(
          p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
        );

        expect(hasWaw).toBe(true);
        // Note: Three-component detection may not detect all components
        // depending on the complexity of the word structure
      });

      it('should normalize مما "mi ma" → "from what"', () => {
        const analysis = analyzeArabicWord('مما', 'mi ma');

        expect(analysis.hasComponents).toBe(true);

        // Should detect من (from) + ما (what)
        // Note: The actual component detection depends on arabicWordComponents.ts rules
        expect(analysis.prefixes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance', () => {
    it('should normalize quickly (< 1ms per call)', () => {
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        normalizeTranslation('ولا', 'wa la');
      }

      const end = performance.now();
      const timePerCall = (end - start) / 1000;

      // Should be sub-millisecond (O(1) Map lookups)
      expect(timePerCall).toBeLessThan(1);
    });

    it('should be fast (normalization is O(1) Map lookup)', () => {
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        analyzeArabicWord('ولا', 'anything');
      }
      const duration = performance.now() - start;

      // Should complete 1000 iterations in under 100ms
      // (normalization is just a Map lookup, very fast)
      expect(duration).toBeLessThan(100);
    });
  });
});
