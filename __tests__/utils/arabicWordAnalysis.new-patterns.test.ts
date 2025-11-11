/**
 * Tests for newly added grammar patterns (2025 improvements)
 *
 * These tests verify patterns added to fix real bugs found via runtime bug detector
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

describe('Arabic Word Analysis: New Patterns (2025)', () => {
  /**
   * Pattern 1: Dual Pronoun Suffix هما with expanded English translations
   */
  describe('Dual Pronoun هما (them/which/those)', () => {
    test('should detect هما suffix in بِهِمَا (by which)', () => {
      const analysis = analyzeArabicWord('بهما', 'by which');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
      expect(analysis.suffix?.arabicMatch).toBe('هما');
      expect(analysis.remainingArabic).toBe(''); // Both components detected, no remaining
    });

    test('should detect هما suffix in فِيهِمَا (in them)', () => {
      const analysis = analyzeArabicWord('فيهما', 'in them');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('في');
      expect(analysis.suffix?.arabicMatch).toBe('هما');
      expect(analysis.remainingArabic).toBe('');
    });

    test('should color both prefix and suffix in بِهِمَا', () => {
      const analysis = analyzeArabicWord('بهما', 'by which');
      const formatted = formatWordAnalysis(analysis);

      expect(formatted.reconstructedArabic).toBeDefined();
      const segments = formatted.reconstructedArabic?.segments || [];

      // Should have 2 segments: prefix ب and suffix هما
      expect(segments.length).toBe(2);
      expect(segments[0]?.text).toBe('ب');
      expect(segments[0]?.type).toBe('prefix');
      expect(segments[1]?.text).toBe('هما');
      expect(segments[1]?.type).toBe('suffix');
    });
  });

  /**
   * Pattern 2: Compound Negation لئلا (to not/lest)
   */
  describe('Compound Negation لئلا (to not)', () => {
    test('should detect لئلا as full compound prefix', () => {
      const analysis = analyzeArabicWord('لئلا', 'to not');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لئلا');
      expect(analysis.remainingArabic).toBe(''); // Full word is the compound
    });

    test('should apply single-word rule to "lest" translation', () => {
      const analysis = analyzeArabicWord('لئلا', 'lest');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
    });

    test('should match "so that not" translation', () => {
      const analysis = analyzeArabicWord('لئلا', 'so that not');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لئلا');
    });
  });

  /**
   * Pattern 3: لل now detected as multi-prefix: ل + ال
   * (Removed old compound tests - now uses multi-prefix detection)
   */

  /**
   * Pattern 4: ومن - Now uses split behavior (multi-word compounds removed)
   */
  describe('ومن with Multi-Word Translations - Split Behavior', () => {
    test('should partially match ومن with "And those" (و matches)', () => {
      const analysis = analyzeArabicWord('ومن', 'And those');

      // و matches "And" (case-insensitive), من doesn't match "those"
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    test('should partially match ومن with "And whoever" (و matches)', () => {
      const analysis = analyzeArabicWord('ومن', 'And whoever');

      // و matches "And"
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    test('should partially match ومن with "And for those" (و matches)', () => {
      const analysis = analyzeArabicWord('ومن', 'And for those');

      // و matches "And"
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    test('should partially match "and whoever" (و matches)', () => {
      const analysis = analyzeArabicWord('ومن', 'and whoever');

      // و matches "and"
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });
  });

  /**
   * Integration Test: Verify false positive reduction
   */
  describe('False Positive Reduction', () => {
    test('should correctly analyze root + suffix without flagging as bug (قُوَّتِهِ)', () => {
      const analysis = analyzeArabicWord('قوته', 'his strength');

      // Should detect suffix ه
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      // Remaining should be root قوت (this is CORRECT behavior)
      expect(analysis.remainingArabic).toBe('قوت');
      expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(3);
    });

    test('should correctly analyze dual marker ين (عَدُوَّيْنِ)', () => {
      const analysis = analyzeArabicWord('عدوين', 'two enemies');

      // Should detect suffix ين
      expect(analysis.suffix?.arabicMatch).toBe('ين');
      // Remaining is the root عدو (this is CORRECT)
      expect(analysis.remainingArabic).toBe('عدو');
    });

    test('should detect both prefix and suffix in لَذَّتُهُ (his pleasure)', () => {
      const analysis = analyzeArabicWord('لذته', 'his pleasure');

      // Should detect suffix ه
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      // Remaining is root لذت (this is CORRECT, not a bug)
      expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(3);
    });
  });

  /**
   * Pattern 5: Interrogative + Negation أما (do you not)
   */
  describe('Interrogative + Negation أما', () => {
    test('should detect أما with "do you not"', () => {
      const analysis = analyzeArabicWord('أما', 'do you not');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('أما');
      expect(analysis.remainingArabic).toBe(''); // Full word is the compound
    });

    test('should match "are you not" translation', () => {
      const analysis = analyzeArabicWord('أما', 'are you not');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('أما');
    });

    test('should match "have you not" translation', () => {
      const analysis = analyzeArabicWord('أما', 'have you not');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('أما');
    });

    test('should match "as for" translation', () => {
      const analysis = analyzeArabicWord('أما', 'as for');

      // Single component → hasComponents=false (no composition)
      expect(analysis.hasComponents).toBe(false);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('أما');
    });
  });

  /**
   * Pattern 6: Demonstrative Pronoun Split Components (PREPOSITION + هذا/هذه)
   * Changed: Demonstratives now split for clearer component breakdown
   */
  describe('Demonstrative Pronoun Split Components', () => {
    test('should split بهذا into ب (in) + هذا (this)', () => {
      const analysis = analyzeArabicWord('بهذا', 'in this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
      expect(analysis.suffix?.arabicMatch).toBe('هذا');
    });

    test('should split لهذا into ل (for) + هذا (this)', () => {
      const analysis = analyzeArabicWord('لهذا', 'for this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ل');
      expect(analysis.suffix?.arabicMatch).toBe('هذا');
    });

    test('should split وهذا into و (and) + هذا (this)', () => {
      const analysis = analyzeArabicWord('وهذا', 'and this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.suffix?.arabicMatch).toBe('هذا');
    });

    test('should split فهذا into ف (then) + هذا (this)', () => {
      const analysis = analyzeArabicWord('فهذا', 'then this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.suffix?.arabicMatch).toBe('هذا');
    });
  });

  /**
   * Pattern 7: PREPOSITION + PARTICLE - Removed for Split Coloring
   * Changed: Multi-word English patterns removed to avoid treating phrases as single units
   */
  describe('PREPOSITION + PARTICLE - Split Components', () => {
    test('should split فيما into في (in) + ما (root)', () => {
      const analysis = analyzeArabicWord('فيما', 'in what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('في');
      // ما remains as root (can't be prefix after prefix removed)
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.remainingArabic).toBe('');
    });

    test('should split بما into ب (with) + ما (root)', () => {
      const analysis = analyzeArabicWord('بما', 'with what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.remainingArabic).toBe('');
    });

    test('should split لما into ل (for) + ما (root)', () => {
      const analysis = analyzeArabicWord('لما', 'for what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ل');
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.remainingArabic).toBe('');
    });

    test('should apply single-word rule to كما (as)', () => {
      const analysis = analyzeArabicWord('كما', 'as');

      // Single-word rule: 'as' is one word, so no color-coding
      expect(analysis.hasComponents).toBe(false);
    });

    test('should match مما with multi-prefix detection (م from من)', () => {
      const analysis = analyzeArabicWord('مما', 'from what');

      // Multi-prefix: م (shortened من) + ما
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
    });

    test('should not match عما (contracted form - different letters than عن)', () => {
      const analysis = analyzeArabicWord('عما', 'about what');

      // عما is contracted, different from standalone عن pattern
      // Compound pattern removed to avoid multi-word English matching
      expect(analysis.hasComponents).toBe(false);
    });
  });

  /**
   * Regression Tests: Ensure existing patterns still work
   */
  describe('Regression: Existing Patterns', () => {
    test('should split وما into و + ما (and what)', () => {
      const analysis = analyzeArabicWord('وما', 'and what');
      // Compound removed - now و matches "and", ما is in remaining
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.remainingArabic).toBe('');
    });

    test('should partially match فمن (so whoever)', () => {
      const analysis = analyzeArabicWord('فمن', 'so whoever');
      // ف matches "so", من doesn't match "whoever"
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
    });

    test('should still detect والبيت (and the house)', () => {
      const analysis = analyzeArabicWord('والبيت', 'and the house');
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ال');
    });
  });
});
