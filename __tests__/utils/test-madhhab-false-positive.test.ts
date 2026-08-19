/**
 * Test for false positive م prefix detection in morphological patterns
 *
 * Bug: "وَمَذْهَبُ" (and school of thought) is incorrectly analyzed as:
 *   - Prefix: و (and) ✓
 *   - Prefix: م (of) ✗ FALSE POSITIVE
 *   - Root: ذهب (wrong - means "gold")
 *
 * Expected: Should be analyzed as:
 *   - Prefix: و (and) ✓
 *   - Root: مذهب (school of thought) ✓
 *
 * Root cause: "م" prefix is defined for grammatical contractions (مِمَّن = من + من),
 * but it's incorrectly matching morphological "م" in words like مذهب where "م" is
 * part of the word formation pattern (مَفْعَل), not a separable grammatical particle.
 *
 * Morphological "م" patterns:
 * - مَفْعَل (place/manner nouns): مَذْهَب (way), مَسْجِد (mosque), مَطْبَخ (kitchen)
 * - مَفْعُول (passive participles): مَكْتُوب (written), مَقْبُول (accepted)
 *
 * These should NEVER be split because "م" is structural, not grammatical.
 */

/**
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('False positive م detection in morphological patterns', () => {
  describe('مذهب (school of thought) - مَفْعَل pattern', () => {
    test('should NOT detect م as prefix in ومذهب', () => {
      const analysis = analyzeArabicWord('ومذهب', 'and school of thought');

      // Should detect only ONE prefix: و (and)
      expect(analysis.prefixes).toHaveLength(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes[0]?.englishMatches).toContain('and');

      // Should NOT detect م as a separate prefix
      const hasMimPrefix = analysis.prefixes.some(p => p.arabicMatch === 'م');
      expect(hasMimPrefix).toBeFalsy();

      // Remaining should be "مذهب" (school of thought), NOT "ذهب" (gold)
      expect(analysis.remainingArabic).toBe('مذهب');
      expect(analysis.remainingEnglish).toMatch(/school.*thought/i);
    });

    test('should NOT detect م as prefix in standalone مذهب', () => {
      const analysis = analyzeArabicWord('مذهب', 'school of thought');

      // Should have NO prefixes detected
      expect(analysis.prefixes).toHaveLength(0);

      // Remaining should be full word "مذهب"
      expect(analysis.remainingArabic).toBe('مذهب');
    });
  });

  describe('Other morphological م patterns', () => {
    test('should NOT split مسجد (mosque)', () => {
      const analysis = analyzeArabicWord('مسجد', 'mosque');

      // Should have NO prefixes
      expect(analysis.prefixes).toHaveLength(0);

      // Full word should remain
      expect(analysis.remainingArabic).toBe('مسجد');
    });

    test('should NOT split مكتوب (written)', () => {
      const analysis = analyzeArabicWord('مكتوب', 'written');

      // Should have NO prefixes
      expect(analysis.prefixes).toHaveLength(0);

      // Full word should remain
      expect(analysis.remainingArabic).toBe('مكتوب');
    });

    test('should NOT split مطبخ (kitchen)', () => {
      const analysis = analyzeArabicWord('مطبخ', 'kitchen');

      // Should have NO prefixes
      expect(analysis.prefixes).toHaveLength(0);

      // Full word should remain
      expect(analysis.remainingArabic).toBe('مطبخ');
    });
  });

  describe('Edge case: "of" embedded in phrases', () => {
    test('should reject "of" when it appears mid-phrase, not as standalone preposition', () => {
      const analysis = analyzeArabicWord('ومذهب', 'and school of thought');

      // "of" is between "school" and "thought" - not a standalone preposition
      // Should NOT match م prefix
      const hasMimPrefix = analysis.prefixes.some(p => p.arabicMatch === 'م');
      expect(hasMimPrefix).toBeFalsy();
    });

    test('should handle multi-word translations without false positives', () => {
      // Similar pattern: word with م + English with "of" in middle
      const analysis = analyzeArabicWord('مكانة', 'status of importance');

      // Should NOT split out م
      expect(analysis.prefixes).toHaveLength(0);
      expect(analysis.remainingArabic).toBe('مكانة');
    });
  });
});
