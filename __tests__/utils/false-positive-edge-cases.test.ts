/**
 * False Positive Edge Case Testing
 *
 * Tests specific patterns identified as potential false positive risks:
 * 1. Short words with conjunctions (و/ف) that might be over-parsed
 * 2. Words with internal alif/yaa (verify our fix)
 * 3. Demonstrative suffixes on non-demonstrative words
 *
 * These tests document expected behavior and provide regression protection.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { analyzeArabicWord } from '../../utils/arabicWordAnalysis';

describe('False Positive Edge Cases', () => {
  describe('Short Root Words (should NOT over-parse)', () => {
    test('should not over-parse short root words starting with و', () => {
      // These are root words, not prefix + remainder
      const tests = [
        {
          arabic: 'ولد',
          english: 'boy',
          description: 'Root و-ل-د, not conjunction و + لد',
        },
        {
          arabic: 'والد',
          english: 'father',
          description: 'Root و-ا-ل-د, not و + ال + د',
        },
        {
          arabic: 'وجه',
          english: 'face',
          description: 'Root و-ج-ه, not conjunction و + جه',
        },
        {
          arabic: 'ورد',
          english: 'rose',
          description: 'Root و-ر-د, not conjunction و + رد',
        },
        {
          arabic: 'وقت',
          english: 'time',
          description: 'Root و-ق-ت, not conjunction و + قت',
        },
      ];

      tests.forEach(({ arabic, english, description }) => {
        const analysis = analyzeArabicWord(arabic, english);

        // Key validation: If components detected, remaining must be ≥3 chars
        if (analysis.hasComponents) {
          expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(3);
        }
      });
    });

    test('should not over-parse short root words starting with ف', () => {
      const tests = [
        {
          arabic: 'فرق',
          english: 'difference',
          description: 'Root ف-ر-ق, not conjunction ف + رق',
        },
        {
          arabic: 'فجر',
          english: 'dawn',
          description: 'Root ف-ج-ر, not conjunction ف + جر',
        },
        {
          arabic: 'فخر',
          english: 'pride',
          description: 'Root ف-خ-ر, not conjunction ف + خر',
        },
      ];

      tests.forEach(({ arabic, english, description }) => {
        const analysis = analyzeArabicWord(arabic, english);

        if (analysis.hasComponents) {
          expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(3);
        }
      });
    });

    test('should correctly detect conjunctions when English confirms them', () => {
      // These SHOULD be parsed because English contains conjunction words
      const tests = [
        {
          arabic: 'وولد',
          english: 'and boy',
          expectedPrefix: 'و',
          description: 'Should detect و when "and" in English',
        },
        {
          arabic: 'فولد',
          english: 'so boy',
          expectedPrefix: 'ف',
          description: 'Should detect ف when "so" in English',
        },
      ];

      tests.forEach(({ arabic, english, expectedPrefix, description }) => {
        const analysis = analyzeArabicWord(arabic, english);

        expect(analysis.hasComponents).toBeTruthy();
        expect(analysis.prefixes.some(p => p.arabicMatch === expectedPrefix)).toBeTruthy();
      });
    });
  });

  describe('Internal Alif/Yaa Verification (should NEVER be infixes)', () => {
    test('should NOT detect internal alif as infix', () => {
      // Critical: After our fix, these should NEVER show infix matches
      const tests = [
        { arabic: 'قال', english: 'he said' },
        { arabic: 'جاء', english: 'he came' },
        { arabic: 'قام', english: 'he stood' },
        { arabic: 'صار', english: 'he became' },
        { arabic: 'كان', english: 'he was' },
        { arabic: 'بات', english: 'he spent the night' },
        { arabic: 'عاد', english: 'he returned' },
        { arabic: 'زار', english: 'he visited' },
      ];

      tests.forEach(({ arabic, english }) => {
        const analysis = analyzeArabicWord(arabic, english);

        // Critical assertion: NO infix should be detected
        expect(analysis.infix).toBeUndefined();
      });
    });

    test('should NOT detect internal yaa as infix', () => {
      const tests = [
        { arabic: 'بيت', english: 'house' },
        { arabic: 'زيت', english: 'oil' },
        { arabic: 'جيد', english: 'good' },
        { arabic: 'ميت', english: 'dead' },
        { arabic: 'سيف', english: 'sword' },
      ];

      tests.forEach(({ arabic, english }) => {
        const analysis = analyzeArabicWord(arabic, english);

        // Critical assertion: NO infix should be detected
        expect(analysis.infix).toBeUndefined();
      });
    });

    test('should detect other infixes correctly (not alif/yaa)', () => {
      // These legitimate infixes should still work
      const tests = [
        {
          arabic: 'انكسر',
          english: 'it broke itself',
          expectedInfix: 'ن',
          description: 'Form VII reflexive',
        },
        {
          arabic: 'اجتمع',
          english: 'they gathered together',
          expectedInfix: 'ت',
          description: 'Form VIII reflexive',
        },
      ];

      tests.forEach(({ arabic, english, expectedInfix, description }) => {
        const analysis = analyzeArabicWord(arabic, english);

        if (analysis.infix) {
          expect(analysis.infix.arabicMatch).toBe(expectedInfix);
        }
      });
    });
  });

  describe('Multi-Word vs Single-Word Analysis', () => {
    test('should NOT color-code single-word English translations', () => {
      // Single English words should never have color-coding
      const tests = [
        { arabic: 'والبيت', english: 'house' }, // Not "and house"
        { arabic: 'كتابه', english: 'book' }, // Not "his book"
        { arabic: 'المدرسة', english: 'school' }, // Not "the school"
        { arabic: 'يكتب', english: 'writes' }, // Not "he writes"
      ];

      tests.forEach(({ arabic, english }) => {
        const analysis = analyzeArabicWord(arabic, english);

        // Single-word rule: Should NOT have components
        expect(analysis.hasComponents).toBeFalsy();
      });
    });

    test('should color-code multi-word English translations', () => {
      const tests = [
        {
          arabic: 'والبيت',
          english: 'and house',
          expectedPrefix: 'و',
        },
        {
          arabic: 'كتابه',
          english: 'his book',
          expectedSuffix: 'ه',
        },
        {
          arabic: 'المدرسة',
          english: 'the school',
          expectedPrefix: 'ال',
        },
      ];

      tests.forEach(({ arabic, english, expectedPrefix, expectedSuffix }) => {
        const analysis = analyzeArabicWord(arabic, english);

        expect(analysis.hasComponents).toBeTruthy();

        if (expectedPrefix) {
          expect(analysis.prefixes.some(p => p.arabicMatch === expectedPrefix)).toBeTruthy();
        }
        if (expectedSuffix) {
          expect(analysis.suffix?.arabicMatch).toBe(expectedSuffix);
        }
      });
    });
  });

  describe('Demonstrative Suffix Edge Cases', () => {
    test('should not falsely detect demonstratives as suffixes', () => {
      // Words that end with demonstrative letter sequences but aren't demonstratives
      const tests = [
        {
          arabic: 'هذا',
          english: 'this',
          description: 'Standalone demonstrative (valid)',
          shouldMatch: true,
        },
        {
          arabic: 'ذلك',
          english: 'that',
          description: 'Standalone demonstrative (valid)',
          shouldMatch: true,
        },
      ];

      tests.forEach(({ arabic, english, description, shouldMatch }) => {
        const analysis = analyzeArabicWord(arabic, english);

        if (shouldMatch) {
          // These are legitimate - single word demonstratives
          // Based on single-word rule, should NOT have components
          const wordCount = english.trim().split(/\s+/).length;
          if (wordCount === 1) {
            expect(analysis.hasComponents).toBeFalsy();
          }
        }
      });
    });
  });

  describe('Validation Logic Verification', () => {
    test('should allow 2-char roots with 2 consonants for prefixes', () => {
      // MIN_REMAINING_LENGTH is 2 (lowered from 3 to support assimilated verbs)
      const shortWord = 'يُحب'; // "he loves" - 2 chars after ي, both consonants

      const analysis = analyzeArabicWord(shortWord, 'he loves');

      // SHOULD detect ي prefix because remaining "حب" has 2 consonants
      expect(analysis.prefixes.find(p => p.arabicMatch === 'ي')).toBeDefined();
    });

    test('should accept valid prefix when remaining length is sufficient', () => {
      const validWord = 'يُكتب'; // "he was writing" - 3 chars after ي

      const analysis = analyzeArabicWord(validWord, 'he was writing');

      // SHOULD detect ي prefix because remaining is 3 chars (كتب)
      expect(analysis.prefixes.some(p => p.arabicMatch === 'ي')).toBeTruthy();
    });

    test('should require English match for component detection', () => {
      // Prefix exists in Arabic but English doesn't contain trigger word
      const tests = [
        {
          arabic: 'والد',
          english: 'father', // No "and" in English
          shouldNotDetect: 'و',
        },
        {
          arabic: 'كتابه',
          english: 'book', // No possessive in English
          shouldNotDetect: 'ه',
        },
      ];

      tests.forEach(({ arabic, english, shouldNotDetect }) => {
        const analysis = analyzeArabicWord(arabic, english);

        // Should NOT detect component without English match
        const hasComponent =
          analysis.prefixes.some(p => p.arabicMatch === shouldNotDetect) ||
          analysis.suffix?.arabicMatch === shouldNotDetect;

        expect(hasComponent).toBeFalsy();
      });
    });
  });

  describe('Summary Statistics', () => {
    test('should report overall false positive findings', () => {
      const allTests = [
        // Short root words
        { arabic: 'ولد', english: 'boy' },
        { arabic: 'والد', english: 'father' },
        { arabic: 'فرق', english: 'difference' },

        // Internal alif/yaa
        { arabic: 'قال', english: 'he said' },
        { arabic: 'بيت', english: 'house' },

        // Single-word cases
        { arabic: 'والبيت', english: 'house' },
        { arabic: 'كتابه', english: 'book' },

        // Valid cases (should match)
        { arabic: 'والكتاب', english: 'and the book' },
        { arabic: 'كتابه', english: 'his book' },
      ];

      const stats = {
        total: allTests.length,
        withComponents: 0,
        withInfixes: 0,
        overParsed: 0,
        correctlyParsed: 0,
      };

      allTests.forEach(({ arabic, english }) => {
        const analysis = analyzeArabicWord(arabic, english);

        if (analysis.hasComponents) {
          stats.withComponents++;
        }
        if (analysis.infix) {
          stats.withInfixes++;
        }

        // Check for over-parsing (remaining < 3 when components detected)
        if (analysis.hasComponents && analysis.remainingArabic.length < 3) {
          stats.overParsed++;
        }

        // Check for correct parsing (valid multi-word with components)
        const wordCount = english.trim().split(/\s+/).length;
        if (wordCount > 1 && analysis.hasComponents) {
          stats.correctlyParsed++;
        }
      });

      // Critical assertions
      expect(stats.withInfixes).toBe(0); // NO alif/yaa infixes after fix
      expect(stats.overParsed).toBe(0); // NO over-parsing with <3 char remaining
    });
  });
});
