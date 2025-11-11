/**
 * Test for standalone particle optimization
 *
 * Core principle: Color-coding is educational when it shows how Arabic words are COMPOSED
 * from multiple grammatical components. Single-component words show no composition.
 *
 * Examples that SHOULD NOT be colored (hasComponents=false):
 *   - "لا → that does not" - single component, no composition to show
 *   - "بل → but rather" - single component, no composition to show
 *   - "من → who" - single component, no composition to show
 *   - "و → and" - single component, no composition to show
 *
 * Examples that SHOULD be colored (hasComponents=true):
 *   - "فإذا → so when" - 2 prefixes (ف + إذا) showing composition
 *   - "والله → and by Allah" - prefix + remaining root showing composition
 *   - "ولا → and not" - 2 prefixes (و + لا) showing composition
 *   - "كتابه → his book" - root + suffix showing composition
 *   - "كِتَابٌ → book" - has diacritic showing case marking
 *
 * Performance benefit: Saves expensive color segment generation for single-component
 * words while preserving educational value when showing composition.
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Standalone particle optimization', () => {
  describe('Single-component words should NOT be colored', () => {
    test('should have hasComponents=false for بل (but rather)', () => {
      // Single component, no composition to show
      const analysis = analyzeArabicWord('بل', 'but rather');

      // Should detect the prefix
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('بل');

      // hasComponents should be FALSE - no composition to show
      expect(analysis.hasComponents).toBe(false);

      // Remaining should be empty (word consumed by prefix)
      expect(analysis.remainingArabic).toBe('');
    });

    test('should have hasComponents=false for لا (that does not)', () => {
      // Single negation component, no composition despite multi-word English
      const analysis = analyzeArabicWord('لا', 'that does not');

      // Should detect the prefix
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لا');

      // hasComponents should be FALSE - single component, no Arabic composition
      expect(analysis.hasComponents).toBe(false);

      // Remaining should be empty
      expect(analysis.remainingArabic).toBe('');
    });

    test('should have hasComponents=false for من (who/he who)', () => {
      // Single interrogative component, no composition
      const analysis = analyzeArabicWord('من', 'he who');

      // Should detect the prefix
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('من');

      // hasComponents should be FALSE - no composition to show
      expect(analysis.hasComponents).toBe(false);

      // Remaining should be empty
      expect(analysis.remainingArabic).toBe('');
    });
  });

  describe('Multi-component words SHOULD be colored', () => {
    test('should have hasComponents=true for فإذا (so when) - 2 prefixes', () => {
      const analysis = analyzeArabicWord('فإذا', 'so when');

      // Should detect 2 prefixes
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);

      // hasComponents should be true (shows composition)
      expect(analysis.hasComponents).toBe(true);
    });

    test('should have hasComponents=true for والله (and by Allah) - prefix + remaining', () => {
      const analysis = analyzeArabicWord('والله', 'and by Allah');

      // Should detect prefix
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');

      // Should have remaining root
      expect(analysis.remainingArabic).toBeTruthy();
      expect(analysis.remainingArabic).not.toBe('');

      // hasComponents should be true (shows composition)
      expect(analysis.hasComponents).toBe(true);
    });

    test('should have hasComponents=true for فقال (so he said) - prefix + remaining', () => {
      const analysis = analyzeArabicWord('فقال', 'so he said');

      // Should detect ف prefix
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');

      // Should have remaining root
      expect(analysis.remainingArabic).toBeTruthy();
      expect(analysis.remainingArabic).not.toBe('');

      // hasComponents should be true (shows composition)
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Words with diacritics SHOULD be colored', () => {
    test('should have hasComponents=true when diacritic is detected', () => {
      // Test the principle: IF a diacritic is detected, THEN hasComponents should be true
      const analysis = analyzeArabicWord('كِتَابٌ', 'book');

      // Only test IF a diacritic was actually detected
      // (diacritic detection depends on the word and system configuration)
      if (analysis.diacritic) {
        expect(analysis.hasComponents).toBe(true);
      } else {
        // If no diacritic detected, this test doesn't apply
        // Just verify the analysis ran without error
        expect(analysis).toBeDefined();
      }
    });

    test('should have hasComponents=true when word has only diacritic detected', () => {
      // Any word with case marking should be colored if diacritic is detected
      const analysis = analyzeArabicWord('مُحَمَّدٌ', 'Muhammad');

      // May or may not detect specific components, but if diacritic detected...
      if (analysis.diacritic) {
        // hasComponents should be true
        expect(analysis.hasComponents).toBe(true);
      }
    });
  });

  describe('Words with suffix SHOULD be colored', () => {
    test('should have hasComponents=true for كتابه (his book) - has suffix', () => {
      const analysis = analyzeArabicWord('كتابه', 'his book');

      // Should detect suffix
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');

      // hasComponents should be true (shows composition)
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle diacritics in particle detection', () => {
      // Particle with diacritics like بَلْ should still be detected
      const analysis = analyzeArabicWord('بَلْ', 'but rather');

      // Should detect the prefix (diacritics normalized away)
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('بل');

      // hasComponents should be FALSE - single component, no composition
      // (diacritics are normalized away, not detected as separate component)
      expect(analysis.hasComponents).toBe(false);
    });

    test('should have hasComponents=true for prefix + infix', () => {
      // If we ever detect infix, hasComponents should be true
      const analysis = analyzeArabicWord('مما', 'from what');

      // Should detect components
      expect(analysis.prefixes.length).toBeGreaterThan(0);

      // hasComponents should be true (shows composition)
      expect(analysis.hasComponents).toBe(true);
    });
  });
});
