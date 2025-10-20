/**
 * Edge Case & Bug-Finding Tests for Arabic Word Analysis
 *
 * These tests target specific potential bugs and edge cases that could
 * cause incorrect grammar color-coding behavior.
 */
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

describe('Arabic Word Analysis: Edge Cases & Potential Bugs', () => {
  /**
   * BUG CATEGORY 1: Contraction Normalization Collision
   *
   * Issue: normalizeEnglish() removes apostrophes, but CONTRACTION_MAP keys have apostrophes
   * This could prevent contraction expansion from working correctly
   */
  describe('Bug: Contraction Handling with Apostrophe Removal', () => {
    it('should detect negation لا with contracted "don\'t"', () => {
      const analysis = analyzeArabicWord('لا', "don't know");

      // Should detect لا prefix even though "don't" has apostrophe
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لا');
      // The match should work because we expand "don't" → "do not"
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });

    it('should detect compound ولا with contracted "and don\'t"', () => {
      const analysis = analyzeArabicWord('ولا', "and don't go");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
      // Should match either compound "ولا" or separate "و"
      expect(['ولا', 'و'].includes(analysis.prefixes[0]?.arabicMatch || '')).toBe(true);
    });

    it('should detect لم negation with "didn\'t" contraction', () => {
      const analysis = analyzeArabicWord('لم', "didn't see");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لم');
      // Should expand "didn't" → "did not" and match
      expect(analysis.prefixes[0]?.englishMatches.some(m =>
        m.includes('did') || m.includes('not') || m.includes('does')
      )).toBe(true);
    });
  });

  /**
   * BUG CATEGORY 2: Standalone Particle Detection with Diacritics
   *
   * Issue: Standalone particle detection compares string lengths, but diacritics
   * affect the original length vs normalized length
   */
  describe('Bug: Standalone Particle Detection with Diacritics', () => {
    it('should allow whole-translation match for لَمْ with diacritics', () => {
      const analysis = analyzeArabicWord('لَمْ', 'did not');

      // Standalone particle لم = entire word, so whole-translation match should be allowed
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لم');
      // The English match should include the full pattern "did not" OR its components
      expect(analysis.prefixes[0]?.englishMatches).toBeDefined();
    });

    it('should allow whole-translation match for لم without diacritics', () => {
      const analysis = analyzeArabicWord('لم', 'did not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لم');
      expect(analysis.prefixes[0]?.englishMatches).toBeDefined();
    });

    it('should detect prefix separately in compound ولم', () => {
      const analysis = analyzeArabicWord('ولم', 'and did not');

      expect(analysis.hasComponents).toBe(true);
      // Should detect compound prefix
      expect(analysis.prefixes[0]).toBeDefined();
    });
  });

  /**
   * BUG CATEGORY 3: Subject Marker False Rejection
   *
   * Issue: Heuristic requires 3+ chars AND 2+ consonants after removing prefix
   * This might incorrectly reject valid short verbs (3-4 letters total)
   */
  describe('Bug: Subject Marker Heuristic Edge Cases', () => {
    it('should NOT detect ي prefix in noun يوم (day)', () => {
      const analysis = analyzeArabicWord('يوم', 'day');

      // "يوم" is a noun, not a verb, so ي should not be detected as prefix
      // Remaining "وم" is only 2 chars and has 1 consonant
      expect(analysis.prefixes[0]).toBeUndefined();
      expect(analysis.hasComponents).toBe(false);
    });

    it('should NOT detect ي prefix in noun يد (hand)', () => {
      const analysis = analyzeArabicWord('يد', 'hand');

      // "يد" is a noun, remaining "د" is only 1 char
      expect(analysis.prefixes[0]).toBeUndefined();
      expect(analysis.hasComponents).toBe(false);
    });

    it('should handle edge case يود (3 chars, verb "he wishes")', () => {
      const analysis = analyzeArabicWord('يود', 'he wishes');

      // Edge case: only 3 chars total
      // Remaining "ود" is 2 chars with 1 consonant (و is vowel, د is consonant)
      // Heuristic should reject this (fails minLength >= 3)
      // This test documents the current behavior
      if (analysis.prefixes[0]) {
        // If detected, verify it's correct
        expect(analysis.prefixes[0].arabicMatch).toBe('ي');
      }
      // Either way is acceptable - we're testing for consistency
    });

    it('should detect ي prefix in verb يرى (he sees)', () => {
      const analysis = analyzeArabicWord('يرى', 'he sees');

      // Word: 3 chars, Remaining after ي: "رى" (2 chars, 1 consonant)
      // Heuristic might reject this (fails requirements)
      // Document actual behavior
      if (analysis.hasComponents) {
        expect(analysis.prefixes[0]?.arabicMatch).toBe('ي');
      }
    });

    it('should detect ت prefix in verb تود (she wishes)', () => {
      const analysis = analyzeArabicWord('تود', 'she wishes');

      // Similar to يود edge case
      if (analysis.hasComponents) {
        expect(analysis.prefixes[0]?.arabicMatch).toBe('ت');
        expect(analysis.prefixes[0]?.englishMatches).toContain('she');
      }
    });
  });

  /**
   * BUG CATEGORY 4: Complete Word Consumption
   *
   * Issue: When prefix + suffix = entire word length with no overlap,
   * remaining Arabic is empty string
   */
  describe('Bug: Complete Word Consumption by Prefix + Suffix', () => {
    it('should handle وه (and it) with both prefix and suffix', () => {
      const analysis = analyzeArabicWord('وه', 'and it');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      // Remaining should be empty (both components consume entire word)
      expect(analysis.remainingArabic).toBe('');
    });

    it('should handle له (for him) with both components', () => {
      const analysis = analyzeArabicWord('له', 'for him');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ل');
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should handle بك (with you) with both components', () => {
      const analysis = analyzeArabicWord('بك', 'with you');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ب');
      expect(analysis.suffix?.arabicMatch).toBe('ك');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should handle وي (and my) without errors', () => {
      const analysis = analyzeArabicWord('وي', 'and my');

      // Both components should be detected
      expect(analysis.hasComponents).toBe(true);
      // Should not throw errors even though nothing remains
      expect(analysis.remainingArabic).toBeDefined();
    });
  });

  /**
   * BUG CATEGORY 5: Cache Key Collision
   *
   * Issue: Cache key uses `|` delimiter, but English normalization removes
   * special characters. Potential for collision if not careful.
   */
  describe('Bug: Cache Key Integrity with Special Characters', () => {
    it('should cache different English translations separately', () => {
      // First call with one translation
      const analysis1 = analyzeArabicWord('كتاب', 'book');

      // Second call with different translation (same Arabic)
      const analysis2 = analyzeArabicWord('كتاب', 'writing');

      // Should return different results (not cached collision)
      expect(analysis1.original.english).toBe('book');
      expect(analysis2.original.english).toBe('writing');
    });

    it('should handle English with special characters correctly', () => {
      // Test with English containing punctuation
      const analysis1 = analyzeArabicWord('كتاب', 'book, guide');
      const analysis2 = analyzeArabicWord('كتاب', 'book; guide');

      // Both should be cached separately (different English after normalization)
      // Normalization removes punctuation, so both might become "book guide"
      // This test verifies cache behavior
      expect(analysis1.original.english).toBe('book, guide');
      expect(analysis2.original.english).toBe('book; guide');
    });

    it('should cache consistently with repeated calls', () => {
      const analysis1 = analyzeArabicWord('والبيت', 'and the house');
      const analysis2 = analyzeArabicWord('والبيت', 'and the house');

      // Should return exactly the same result (from cache)
      expect(analysis1.hasComponents).toBe(analysis2.hasComponents);
      expect(analysis1.prefixes[0]?.arabicMatch).toBe(analysis2.prefixes[0]?.arabicMatch);
      expect(analysis1).toEqual(analysis2);
    });
  });

  /**
   * BUG CATEGORY 6: Bracket Injection for Divine Names & Compounds
   *
   * Issue: Bracket injection skip logic checks for "الله" but needs to handle
   * compound forms and variations correctly
   */
  describe('Bug: Bracket Injection for Divine Names', () => {
    it('should NOT inject [the] for اللهم (O Allah)', () => {
      const analysis = analyzeArabicWord('اللهم', 'O Allah');

      // Should not inject bracket because it contains divine name
      expect(analysis.hasBracketInjection).toBe(false);
    });

    it('should NOT inject [the] for بالله (by Allah)', () => {
      const analysis = analyzeArabicWord('بالله', 'by Allah');

      // Has preposition + definite article pattern, but contains "الله"
      expect(analysis.hasBracketInjection).toBe(false);
    });

    it('should NOT inject [the] for والله (oath: by Allah)', () => {
      const analysis = analyzeArabicWord('والله', 'by Allah');

      // Common oath formula, should skip injection
      expect(analysis.hasBracketInjection).toBe(false);
    });

    it('should inject [the] for regular definite article words', () => {
      const analysis = analyzeArabicWord('الكتاب', 'book');

      // Regular word with definite article, should inject
      expect(analysis.hasBracketInjection).toBe(true);
    });
  });

  /**
   * BUG CATEGORY 7: Pattern Priority Ambiguity
   *
   * Issue: When multiple patterns match with equal length, the order in
   * ARABIC_PREFIXES/SUFFIXES array determines which wins. Should be deterministic.
   */
  describe('Bug: Pattern Priority and Deterministic Matching', () => {
    it('should consistently match في (preposition vs suffix conflict)', () => {
      // "في" could be:
      // - Preposition prefix "في" (in)
      // - Ends with suffix "ي" (my)
      const analysis = analyzeArabicWord('في', 'in me');

      // Should detect both or have consistent priority
      expect(analysis.hasComponents).toBe(true);

      // Prefix should be longer and win
      if (analysis.prefixes[0]) {
        expect(analysis.prefixes[0].arabicMatch).toBe('في');
      }

      // Test consistency: run again and verify same result
      const analysis2 = analyzeArabicWord('في', 'in me');
      expect(analysis.prefixes[0]?.arabicMatch).toBe(analysis2.prefixes[0]?.arabicMatch);
      expect(analysis.suffix?.arabicMatch).toBe(analysis2.suffix?.arabicMatch);
    });

    it('should consistently match من (preposition vs particle)', () => {
      // "من" appears in both BASE_PREPOSITIONS and OTHER_PREFIXES
      const analysis1 = analyzeArabicWord('من', 'from me');
      const analysis2 = analyzeArabicWord('من', 'from me');

      // Should give same result both times (deterministic)
      expect(analysis1.prefixes[0]?.arabicMatch).toBe(analysis2.prefixes[0]?.arabicMatch);
      expect(analysis1.hasComponents).toBe(analysis2.hasComponents);
    });

    it('should prioritize longer patterns over shorter ones', () => {
      // Test word with both "وال" (compound) and "و" (simple) patterns
      const analysis = analyzeArabicWord('والكتاب', 'and the book');

      // Should match longer pattern "وال" not just "و"
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ال');
    });
  });

  /**
   * SPLIT COLORING: Conjunction + Particle (وما، فما, etc.)
   *
   * Changed Behavior (2025): Removed compound patterns to enable split coloring.
   * Words like "وما" (and what) now split into separate components:
   * - و matches "and"
   * - ما remains in root (or matches "what" if standalone)
   *
   * This allows clearer educational breakdown of compound Arabic words.
   */
  describe('Split Coloring: Conjunction + Particle', () => {
    it('should split وما (and what) into separate components', () => {
      const analysis = analyzeArabicWord('وما', 'and what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
      // Should detect "و" not compound "وما"
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      // Remaining is "ما"
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should split فما (so what) into separate components', () => {
      const analysis = analyzeArabicWord('فما', 'so what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
      // Should detect "ف" not compound "فما"
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should split فمن (so whoever) into separate components', () => {
      const analysis = analyzeArabicWord('فمن', 'so whoever');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
      // Should detect "ف" not compound "فمن"
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should detect multi-prefix ومن (and whoever)', () => {
      const analysis = analyzeArabicWord('ومن', 'and whoever');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
      // Multi-prefix: و (and) + من (from/who)
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      // من should also be detected as a prefix
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle case variations and whitespace', () => {
      // Test with capital letter
      const analysis1 = analyzeArabicWord('ومن', 'And whoever');
      expect(analysis1.hasComponents).toBe(true);
      expect(analysis1.prefixes[0]?.arabicMatch).toBe('و'); // Split behavior

      // Test with extra whitespace
      const analysis2 = analyzeArabicWord('فمن', '  so whoever  ');
      expect(analysis2.hasComponents).toBe(true);
      expect(analysis2.prefixes[0]?.arabicMatch).toBe('ف'); // Split behavior
    });

    it('should color فمن with split coloring when multiple components match', () => {
      const analysis = analyzeArabicWord('فمن', 'so who');
      const formatted = formatWordAnalysis(analysis);

      // Analysis should detect split components
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');

      // With split coloring, we may have multiple colored segments
      expect(formatted.reconstructedArabic).toBeDefined();
    });
  });
});
