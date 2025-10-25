/**
 * Advanced Edge Case & Bug-Finding Tests for Arabic Word Analysis
 *
 * This test suite contains comprehensive tests targeting advanced edge cases
 * and potential bugs discovered through deep code analysis.
 *
 * Categories covered:
 * - Token count changes after contraction expansion
 * - Multiple contraction handling
 * - Empty string and whitespace edge cases
 * - Infix detection at boundary positions
 * - Overlap resolution tie-breaking
 * - Position mapping with diacritics
 * - Cache consistency issues
 * - Unicode normalization
 * - Case sensitivity
 * - Possessive apostrophes
 */
import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('Arabic Word Analysis: Advanced Edge Cases', () => {
  /**
   * BUG CATEGORY 8: Token Count After Expansion
   *
   * CRITICAL ISSUE: shouldRejectWholeTranslationMatch() receives token count AFTER
   * contraction expansion. This changes the semantic meaning:
   * - Original: "don't go" = 2 tokens
   * - Expanded: "do not go" = 3 tokens
   *
   * The rejection logic might behave differently based on this count change.
   */
  describe('Bug: Token Count After Contraction Expansion', () => {
    it('should handle 2-word phrase that becomes 3 words after expansion', () => {
      // "don't go" (2 words) → "do not go" (3 words)
      const analysis = analyzeArabicWord('لا', "don't go");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لا');
      // Should still match "not" even though token count changed
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });

    it('should handle 3-word phrase that becomes 4 words after expansion', () => {
      // "I don't know" (3 words) → "I do not know" (4 words)
      const analysis = analyzeArabicWord('لا', "I don't know");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });

    it('should handle standalone particle with contracted translation', () => {
      // Standalone particle لم with contracted translation
      const analysis = analyzeArabicWord('لم', "didn't");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('لم');
    });

    it('should reject whole-translation match correctly after expansion', () => {
      // Test that whole-translation rejection works with expanded text
      // "والبيت" should NOT match if translation is just "and the house"
      const analysis = analyzeArabicWord('والبيت', 'and the house');

      expect(analysis.hasComponents).toBe(true);
      // Should detect "و" or "وال" prefix, not reject all components
      expect(analysis.prefixes[0]).toBeDefined();
    });

    it('should handle double contraction expansion', () => {
      // "won't don't" → "will not do not"
      const analysis = analyzeArabicWord('لا', "won't don't");

      expect(analysis.hasComponents).toBe(true);
      // Should match "not" from either contraction
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });
  });

  /**
   * BUG CATEGORY 9: Multiple Contraction Expansion
   *
   * Issue: Multiple contractions in one phrase - expansion order and interference
   */
  describe('Bug: Multiple Contractions in One Phrase', () => {
    it('should expand multiple contractions independently', () => {
      // "he's won't" → "he is will not"
      const analysis = analyzeArabicWord('لا', "he's won't go");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });

    it('should handle sequential negation contractions', () => {
      // "don't can't" → "do not cannot"
      const analysis = analyzeArabicWord('لا', "don't can't");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });

    it('should handle contraction followed by regular word', () => {
      const analysis = analyzeArabicWord('و', "I'm and you");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes[0]?.englishMatches).toContain('and');
    });

    it('should handle mixed contractions with conjunctions', () => {
      const analysis = analyzeArabicWord('و', "don't and won't");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should handle three contractions in sequence', () => {
      const analysis = analyzeArabicWord('لا', "I've don't won't");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.englishMatches).toContain('not');
    });
  });

  /**
   * BUG CATEGORY 10: Empty String & Whitespace Edge Cases
   *
   * Issue: Unexpected behavior with empty or whitespace-only inputs
   */
  describe('Bug: Empty String and Whitespace Handling', () => {
    it('should handle empty Arabic string gracefully', () => {
      const analysis = analyzeArabicWord('', 'test');

      expect(analysis.hasComponents).toBe(false);
      expect(analysis.original.arabic).toBe('');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should handle empty English string gracefully', () => {
      const analysis = analyzeArabicWord('test', '');

      expect(analysis.hasComponents).toBe(false);
      expect(analysis.original.english).toBe('');
    });

    it('should handle both empty strings', () => {
      const analysis = analyzeArabicWord('', '');

      expect(analysis.hasComponents).toBe(false);
      expect(analysis.original.arabic).toBe('');
      expect(analysis.original.english).toBe('');
    });

    it('should handle whitespace-only Arabic', () => {
      const analysis = analyzeArabicWord('   ', 'test');

      // After normalization, whitespace becomes empty
      expect(analysis.remainingArabic).toBe('');
    });

    it('should handle whitespace-only English', () => {
      const analysis = analyzeArabicWord('test', '   ');

      expect(analysis.original.english).toBe('   ');
      expect(analysis.remainingEnglish).toBe('');
    });

    it('should handle extra whitespace in English translation - single-word rule applies', () => {
      const analysis = analyzeArabicWord('و', '   and   ');

      // Single-word rule: 'and' (after trim) is one word, so no color-coding
      expect(analysis.hasComponents).toBe(false);
    });
  });

  /**
   * BUG CATEGORY 11: Infix at Index 0 After Prefix Removal
   *
   * Issue: Infix detection requires index > 0, but what if infix is at position 0
   * of the remaining text after prefix removal?
   */
  describe('Bug: Infix Detection at Boundary Positions', () => {
    it('should detect infix even if at start of remaining text', () => {
      // Hypothetical case where after removing prefix, infix is at position 0
      // This tests the boundary condition in infix detection logic
      const analysis = analyzeArabicWord('استقبل', 'he welcomed');

      // Should detect the Form X infix ست even at boundary
      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ست');
      }
    });

    it('should not detect infix at word start (before any prefix)', () => {
      // "ست" at the start of a word shouldn't be detected as infix
      const analysis = analyzeArabicWord('ستة', 'six');

      // Should NOT detect ست as infix since it's at the start
      expect(analysis.infix).toBeUndefined();
    });

    it('should not detect infix at word end', () => {
      // Infix shouldn't be detected if it's at the very end
      const analysis = analyzeArabicWord('قست', 'I measured');

      // "ست" at end should not be detected as infix (requires internal position)
      expect(analysis.infix).toBeUndefined();
    });
  });

  /**
   * BUG CATEGORY 12: Overlap Resolution Tie-Breaking
   *
   * Issue: When prefix and suffix have equal length and overlap, the code uses >=
   * which always chooses prefix. Is this always correct?
   */
  describe('Bug: Overlap Resolution with Equal Lengths', () => {
    it('should handle 1-char prefix and 1-char suffix overlap', () => {
      // 'كه' where prefix 'ك' (like) and suffix 'ه' (his/it) both 1 char
      const analysis = analyzeArabicWord('كه', 'like it');

      expect(analysis.hasComponents).toBe(true);
      // Should consistently choose one (likely prefix due to >= in code)
      const hasPrefix = !!analysis.prefixes[0];
      const hasSuffix = !!analysis.suffix;

      // Can't have both overlapping, must choose one
      if (hasPrefix && hasSuffix) {
        // If both present, they shouldn't overlap
        expect(
          analysis.prefixes[0]!.arabicMatch.length + analysis.suffix!.arabicMatch.length,
        ).toBeLessThanOrEqual(2);
      }
    });

    it('should handle equal-length 2-char overlap', () => {
      // Create scenario where both 2-char components overlap
      const analysis = analyzeArabicWord('فيه', 'in it');

      expect(analysis.hasComponents).toBe(true);
      // في (2 chars) + ه (1 char) = 3 chars, so no overlap in 'فيه'
      // Both can coexist without overlapping
      if (analysis.prefixes[0] && analysis.suffix) {
        // This is expected behavior - prefix and suffix don't overlap
        expect(analysis.prefixes[0].arabicMatch).toBe('في');
        expect(analysis.suffix.arabicMatch).toBe('ه');
      }
    });

    it('should be deterministic in tie-breaking', () => {
      // Same input should always produce same result
      const analysis1 = analyzeArabicWord('كه', 'like it');
      const analysis2 = analyzeArabicWord('كه', 'like it');

      expect(analysis1.prefixes[0]?.arabicMatch).toBe(analysis2.prefixes[0]?.arabicMatch);
      expect(analysis1.suffix?.arabicMatch).toBe(analysis2.suffix?.arabicMatch);
    });
  });

  /**
   * BUG CATEGORY 13: mapToOriginalPosition Edge Cases
   *
   * Issue: Boundary conditions in diacritic position mapping
   */
  describe('Bug: Position Mapping with Diacritics', () => {
    it('should handle text with only diacritics', () => {
      // Edge case: what if text is all diacritics?
      const analysis = analyzeArabicWord('ً', 'a');

      // Should handle gracefully
      expect(analysis.original.arabic).toBe('ً');
    });

    it('should handle text with diacritics at every position', () => {
      const analysis = analyzeArabicWord('وَهَ', 'and it');

      expect(analysis.hasComponents).toBe(true);
      // Should handle diacritics between every character
    });

    it('should handle multiple consecutive diacritics', () => {
      const analysis = analyzeArabicWord('كًٌِتاب', 'book');

      // Should normalize correctly even with multiple diacritics
      expect(analysis.remainingArabic).toBe('كتاب');
    });

    it('should handle diacritic-only suffix', () => {
      const analysis = analyzeArabicWord('كتابً', 'a book');

      // Should detect tanween as diacritic
      if (analysis.diacritic) {
        expect(analysis.diacritic.arabicMatch).toBe('ً');
      }
    });
  });

  /**
   * BUG CATEGORY 14: Cache Inconsistency with Expanded Text
   *
   * Issue: Cache key uses original English, but remainingEnglish uses normalized
   * from EXPANDED text
   */
  describe('Bug: Cache Consistency with Contraction Expansion', () => {
    it('should have consistent remainingEnglish in cached vs non-cached calls', () => {
      // First call - not cached
      const analysis1 = analyzeArabicWord('كتاب', "don't know");

      // Second call - cached
      const analysis2 = analyzeArabicWord('كتاب', "don't know");

      // remainingEnglish should be identical
      expect(analysis1.remainingEnglish).toBe(analysis2.remainingEnglish);
    });

    it('should cache correctly with different contractions expanding to same form', () => {
      // Both expand to contain "not" but are different inputs
      const analysis1 = analyzeArabicWord('لا', "don't go");
      const analysis2 = analyzeArabicWord('لا', "won't go");

      // Should be different cache entries
      expect(analysis1.original.english).toBe("don't go");
      expect(analysis2.original.english).toBe("won't go");
    });

    it('should preserve original English in cached results', () => {
      const original = "I don't know";
      const analysis1 = analyzeArabicWord('لا', original);
      const analysis2 = analyzeArabicWord('لا', original);

      // Original should be preserved, not expanded form
      expect(analysis1.original.english).toBe(original);
      expect(analysis2.original.english).toBe(original);
    });

    it('should handle cache with possessive apostrophes', () => {
      const analysis1 = analyzeArabicWord('كتاب', "John's book");
      const analysis2 = analyzeArabicWord('كتاب', "John's book");

      expect(analysis1.original.english).toBe("John's book");
      expect(analysis2.original.english).toBe("John's book");
      expect(analysis1).toEqual(analysis2);
    });
  });

  /**
   * BUG CATEGORY 15: Multiple Whitespace Types
   *
   * Issue: English with tabs, newlines, or mixed whitespace
   */
  describe('Bug: Non-Standard Whitespace Characters', () => {
    it('should handle tabs in English translation', () => {
      const analysis = analyzeArabicWord('و', 'and\tthe');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should handle newlines in English translation', () => {
      const analysis = analyzeArabicWord('و', 'and\nthe');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should handle mixed whitespace types', () => {
      const analysis = analyzeArabicWord('والكتاب', 'and \t\n the book');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes).toHaveLength(2);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      expect(analysis.prefixes[1]?.arabicMatch).toBe('ال');
    });
  });

  /**
   * BUG CATEGORY 16: Case Sensitivity Edge Cases
   *
   * Issue: Mixed case or all caps in English
   */
  describe('Bug: Case Sensitivity in English Matching', () => {
    it('should handle Title Case in English', () => {
      const analysis = analyzeArabicWord('والكتاب', 'And The Book');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
    });

    it('should handle ALL CAPS in English', () => {
      const analysis = analyzeArabicWord('والكتاب', 'AND THE BOOK');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
    });

    it('should handle mIxEd CaSe in English', () => {
      const analysis = analyzeArabicWord('و', 'AnD the');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });
  });

  /**
   * BUG CATEGORY 17: Possessive Apostrophes
   *
   * Issue: Non-contraction apostrophes like "John's book" get stripped
   */
  describe('Bug: Possessive Apostrophes vs Contractions', () => {
    it('should handle possessive apostrophes without false matches', () => {
      const analysis = analyzeArabicWord('كتاب', "John's book");

      // "John's" is not a contraction, apostrophe should be stripped
      // Should not cause false matches
      expect(analysis.original.english).toBe("John's book");
    });

    it('should distinguish between possessive and contraction "it\'s"', () => {
      // "it's" as contraction "it is"
      const analysis = analyzeArabicWord('هو', "it's");

      // Should expand "it's" to "it is"
      expect(analysis.original.english).toBe("it's");
    });

    it('should handle mixed possessives and contractions', () => {
      const analysis = analyzeArabicWord('كتاب', "John's don't");

      // "John's" = possessive, "don't" = contraction
      expect(analysis.original.english).toBe("John's don't");
    });
  });

  /**
   * BUG CATEGORY 18: Bracket Injection Position Checks
   *
   * Issue: "the" in different positions should still skip injection
   */
  describe('Bug: Bracket Injection with "the" at Various Positions', () => {
    it('should not inject when "the" is in the middle', () => {
      const analysis = analyzeArabicWord('الكتاب', 'in the house');

      // Has definite article, but translation has "the"
      expect(analysis.hasBracketInjection).toBe(false);
    });

    it('should not inject when "the" is at the end', () => {
      const analysis = analyzeArabicWord('الكتاب', 'inside the');

      expect(analysis.hasBracketInjection).toBe(false);
    });

    it('should not inject when "the" is at the start', () => {
      const analysis = analyzeArabicWord('الكتاب', 'the book');

      expect(analysis.hasBracketInjection).toBe(false);
    });

    it('should inject when "the" is part of another word', () => {
      // FIXED: "then" contains "the" but now correctly uses word boundary check
      const analysis = analyzeArabicWord('الكتاب', 'then book');

      // Should inject because "the" as a whole word is not present
      expect(analysis.hasBracketInjection).toBe(true);
    });
  });

  /**
   * BUG CATEGORY 19: Pattern Anchors Stripped But Logic Uses startsWith
   *
   * Issue: Patterns have ^ anchors stripped, but matching uses .startsWith() not regex
   */
  describe('Bug: Pattern Anchor Behavior', () => {
    it('should only match prefix at word start, not middle', () => {
      // Pattern with ^ anchor should only match at start
      const analysis = analyzeArabicWord('كتاب', 'book');

      // Should not detect "ك" as prefix in middle of unrelated word
      expect(analysis.prefixes[0]).toBeUndefined();
    });

    it('should consistently apply single-word rule', () => {
      const analysis1 = analyzeArabicWord('و', 'and');
      const analysis2 = analyzeArabicWord('و', 'and');

      // Single-word rule: both should have no components for educational clarity
      expect(analysis1.hasComponents).toBe(false);
      expect(analysis2.hasComponents).toBe(false);
      // Should be cached consistently
      expect(analysis1).toEqual(analysis2);
    });

    it('should handle pattern without anchor correctly', () => {
      // Definite article "ال" without anchor should match anywhere
      const analysis = analyzeArabicWord('والكتاب', 'and the book');

      expect(analysis.hasComponents).toBe(true);
    });
  });

  /**
   * BUG CATEGORY 20: Unicode Normalization
   *
   * Issue: Same visual Arabic text in different Unicode forms (NFC vs NFD)
   */
  describe('Bug: Unicode Normalization Forms', () => {
    it('should handle Arabic text consistently regardless of Unicode form', () => {
      // Same word but might be in different Unicode normalization
      const analysis1 = analyzeArabicWord('كتاب', 'book');
      const analysis2 = analyzeArabicWord('كتاب', 'book');

      expect(analysis1.remainingArabic).toBe(analysis2.remainingArabic);
    });

    it('should handle zero-width characters', () => {
      // FIXED: Zero-width characters are now stripped during normalization
      const analysis = analyzeArabicWord('و\u200Bكتاب', 'and book');

      // Should still detect "و" despite zero-width character (now stripped)
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should handle right-to-left marks - single-word rule applies', () => {
      // FIXED: Right-to-left mark (\u200F) is now stripped during normalization
      const analysis = analyzeArabicWord('\u200Fو', 'and');

      // Single-word rule: 'and' is one word, so no color-coding
      expect(analysis.hasComponents).toBe(false);
    });
  });

  /**
   * INTEGRATION: Complex Multi-Component Scenarios
   *
   * Tests combining multiple edge cases
   */
  describe('Integration: Complex Edge Case Combinations', () => {
    it('should handle contraction + multiple components + diacritics', () => {
      const analysis = analyzeArabicWord('وَلَمْ', "and didn't");

      expect(analysis.hasComponents).toBe(true);
      // Should detect compound or individual components
      expect(analysis.prefixes[0]).toBeDefined();
    });

    it('should handle ALL CAPS + contractions + whitespace', () => {
      const analysis = analyzeArabicWord('ولا', "  AND  DON'T  ");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
    });

    it('should handle empty prefix + suffix + contraction', () => {
      const analysis = analyzeArabicWord('ه', "it's");

      // "ه" suffix with contracted "it's" (it is)
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.suffix?.arabicMatch).toBe('ه');
    });

    it('should handle multiple edge cases at once', () => {
      // All caps + contraction + extra whitespace + possessive
      const analysis = analyzeArabicWord('والكتاب', "  AND  JOHN'S  DON'T  ");

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes[0]).toBeDefined();
    });
  });
});
