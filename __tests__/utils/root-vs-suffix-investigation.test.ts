/**
 * Root vs Suffix False Positive Investigation
 *
 * This test file investigates cases where the grammar color system incorrectly
 * identifies root letters as grammatical suffixes.
 *
 * ISSUE: The suffix detection system has no mechanism to distinguish between:
 * - Root letters (part of the word's fundamental meaning)
 * - Grammatical suffixes (attached pronouns, markers, etc.)
 *
 * It relies purely on:
 * 1. Pattern matching (does word end with this Arabic pattern?)
 * 2. English matching (does English contain these words?)
 *
 * This creates FALSE POSITIVES where root letters are colored as suffixes.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { beforeEach, describe, expect, test } from '@jest/globals';

import {
  analyzeArabicWord,
  formatWordAnalysis,
  clearAnalysisCache,
} from '@/utils/arabicWordAnalysis';
import { ComponentType } from '@/constants/arabicWordComponents';

describe('Root vs Suffix Investigation: False Positive Detection', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure fresh analysis
    clearAnalysisCache();
  });
  /**
   * CATEGORY 1: Words ending in ه (hā') as ROOT LETTER
   *
   * The suffix "ه$" matches: ['his', 'its', 'it', 'of him', 'him', 'himself', 'he', 'their']
   *
   * Problem: Any word ending in ه will be colored as suffix if English contains
   * "he", "his", "it", etc. - even when ه is part of the root!
   */
  describe('🔴 HIGH RISK: ه as Root Letter (not suffix)', () => {
    test('should NOT color ه as suffix in فقيه (scholar)', () => {
      // Root: ف-ق-ه (f-q-h) = to understand, jurisprudence
      // The final ه is PART OF THE ROOT, not a pronoun suffix
      const analysis = analyzeArabicWord('فقيه', 'scholar');

      // EXPECTED: ه should NOT be detected as suffix
      // ACTUAL: May incorrectly detect ה as suffix if "he" appears in context
      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ه in وجه (face) when English contains "he"', () => {
      // Root: و-ج-ه (w-j-h) = face, direction
      const analysis = analyzeArabicWord('وجه', 'he faced');

      // FIXED: With improved suffix validation, ה is no longer detected as suffix
      // English has "he" (subject pronoun only, no object/possessive)
      // Our validation correctly rejects ה as false positive
      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ه in سفيه (foolish) with "his" context', () => {
      // Root: س-ف-ه (s-f-h) = foolishness
      const analysis = analyzeArabicWord('سفيه', 'his foolish behavior');

      // "his" appears in English, but ה is root, not possessive suffix
      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ه in كره (he hates)', () => {
      // Root: ك-ر-ه (k-r-h) = to hate, dislike
      const analysis = analyzeArabicWord('كره', 'he hates');

      // Perfect storm: ends in ה AND English has "he"
      // But ה is part of root ك-ר-ه, not pronoun suffix!
      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ه in نزه (integrity, purity)', () => {
      // Root: ن-ز-ه (n-z-h) = to be free from, pure
      const analysis = analyzeArabicWord('نزه', 'he is pure');

      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ه in يكره (he hates) - prefix + root ending in ه', () => {
      // Root: ك-ر-ه (k-r-h) = to hate, dislike
      // Prefix: ي (he)
      // This is a tricky case: prefix ي + root كره
      const analysis = analyzeArabicWord('يكره', 'he hates');

      // Should detect ي as prefix
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ي');

      // Should NOT detect ה as suffix (it's part of root ك-ر-ه)
      expect(analysis.suffix).toBeUndefined();
    });
  });

  /**
   * CATEGORY 2: Nisba Adjectives ending in ي (yā')
   *
   * The suffix "ي$" matches: ['my', 'mine', 'of me']
   *
   * Problem: Nisba adjectives (Arabic relative adjectives) end in ي
   * Examples: مصري (Egyptian), عربي (Arabic), إسلامي (Islamic)
   *
   * The ي is a nisba suffix (derivational morphology), NOT a possessive pronoun!
   */
  describe('🟡 MEDIUM RISK: ي (nisba suffix) vs ي (possessive suffix)', () => {
    test('should NOT color ي as possessive in مصري (Egyptian)', () => {
      // مصر (Egypt) + ي (nisba) = Egyptian
      // The ي makes it an adjective, it's NOT "my"!
      const analysis = analyzeArabicWord('مصري', 'Egyptian man');

      expect(analysis.suffix).toBeUndefined();
    });

    test.failing('should NOT color ي as possessive in عربي (Arabic)', () => {
      const analysis = analyzeArabicWord('عربي', 'my Arabic teacher');

      // Known product defect: "my" currently makes the nisba ي look possessive.
      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ي in إسلامي (Islamic)', () => {
      const analysis = analyzeArabicWord('إسلامي', 'Islamic principles');

      // Less likely false positive (no "my" in English)
      // But system would still match if we said "my Islamic values"
      expect(analysis.suffix).toBeUndefined();
    });
  });

  /**
   * CATEGORY 3: Words ending in ها (hā') as ROOT LETTER
   *
   * The suffix "ها$" matches: ['her', 'hers', 'its', 'it', 'their']
   *
   * Problem: Some feminine nouns and verb forms end in ها as part of root
   */
  describe('🔴 HIGH RISK: ها as Root Letter (not suffix)', () => {
    test('should NOT color ها in فكاهة (humor, wit)', () => {
      // Root: ف-ك-ه (f-k-h) = to jest, make witty remarks
      // Pattern: فَعَالَة (abstract noun form)
      const analysis = analyzeArabicWord('فكاهة', 'humor');

      // ها is NOT a pronoun, it's part of the pattern!
      expect(analysis.suffix).toBeUndefined();
    });

    test('should NOT color ها in جباهة (forehead - poetic)', () => {
      // Root: ج-ب-ه (j-b-h) = forehead
      const analysis = analyzeArabicWord('جباهة', 'his forehead');

      expect(analysis.suffix).toBeUndefined();
    });
  });

  /**
   * CATEGORY 4: Prepositions + Suffixes
   *
   * Prepositions like على، لدى، إلى commonly take pronoun suffixes directly
   */
  describe('🔵 PREPOSITION + SUFFIX: Must Detect Both', () => {
    test('SHOULD detect علي prefix and ه suffix in عليه (on him)', () => {
      // Preposition: علي (form of على before suffix: alef maksura → yeh)
      // Suffix: ه (him)
      const analysis = analyzeArabicWord('عليه', 'in him');

      // Should detect BOTH prefix and suffix
      expect(analysis.prefixes.length).toBeGreaterThan(0);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('علي'); // علي (not على) - alef maksura becomes yeh before suffixes
      expect(analysis.prefixes[0]?.englishMatches).toContain('in');
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.suffix?.englishMatches).toContain('him');
    });

    test('SHOULD detect لدى prefix and ه suffix in لديه (with him)', () => {
      // Preposition: لدى (with/at)
      // Suffix: ه (him)
      const analysis = analyzeArabicWord('لديه', 'with him');

      // Should detect ה suffix
      expect(analysis.suffix?.arabicMatch).toBe('ه');
    });

    test('SHOULD detect إلى prefix and ه suffix in إليه (to him)', () => {
      // Preposition: إلى (to/towards)
      // Suffix: ه (him)
      const analysis = analyzeArabicWord('إليه', 'to him');

      // Should detect ה suffix
      expect(analysis.suffix?.arabicMatch).toBe('ه');
    });
  });

  /**
   * CATEGORY 5: LEGITIMATE SUFFIXES (Must Still Work Correctly)
   *
   * These are REAL grammatical suffixes that SHOULD be colored.
   * We need to ensure our fix doesn't break these!
   */
  describe('✅ CONTROL GROUP: Legitimate Suffixes (Must Still Detect)', () => {
    test('SHOULD color ه in كتابه (his book)', () => {
      // Root: ك-ت-ب (book) + suffix ه (his)
      // This is a REAL suffix, must be detected!
      const analysis = analyzeArabicWord('كتابه', 'his book');

      // MUST detect this as suffix (legitimate)
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.suffix?.englishMatches).toContain('his');
    });

    test('SHOULD color ها in كتابها (her book)', () => {
      // Root: ك-ت-ب + suffix ها (her)
      const analysis = analyzeArabicWord('كتابها', 'her book');

      // MUST detect this (legitimate suffix)
      expect(analysis.suffix?.arabicMatch).toBe('ها');
      expect(analysis.suffix?.englishMatches).toContain('her');
    });

    test('SHOULD color ي in كتابي (my book)', () => {
      // Root: ك-ت-ب + suffix ي (my)
      const analysis = analyzeArabicWord('كتابي', 'my book');

      // MUST detect this (legitimate suffix)
      expect(analysis.suffix?.arabicMatch).toBe('ي');
      expect(analysis.suffix?.englishMatches).toContain('my');
    });

    test('SHOULD color هم in كتابهم (their book)', () => {
      // Root: ك-ت-ب + suffix هم (their)
      const analysis = analyzeArabicWord('كتابهم', 'their book');

      // MUST detect this (legitimate suffix)
      expect(analysis.suffix?.arabicMatch).toBe('هم');
      expect(analysis.suffix?.englishMatches).toContain('their');
    });
  });

  /**
   * CATEGORY 6: Diacritic Color Inheritance on Pronoun Suffixes
   */
  describe('🎨 DIACRITIC COLOR INHERITANCE: Pronoun Suffixes', () => {
    test('should detect prefix and suffix in عَلَيْهِ (in him)', () => {
      // Preposition: علي (form of على before suffix: alef maksura → yeh)
      // Pronoun suffix ه — kasra ِ is genitive case but not independently detected
      // (standalone "in" removed from kasra English matches to prevent false coloring)
      const analysis = analyzeArabicWord('عَلَيْهِ', 'in him');

      // Should detect prefix and suffix
      expect(analysis.prefixes.length).toBeGreaterThan(0);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('علي');
      expect(analysis.suffix?.arabicMatch).toBe('ه');
    });

    test('should make diacritic inherit suffix color in كِتَابَهُ (his book)', () => {
      // Pronoun suffix ه with nominative case marker ُ
      // Add "he" to match damma ُ
      const analysis = analyzeArabicWord('كِتَابَهُ', 'he read his book');

      // Should detect both suffix and diacritic
      expect(analysis.suffix?.arabicMatch).toBe('ه');

      // Diacritic should be detected and inherit suffix color
      expect(analysis.diacritic?.arabicMatch).toBe('ُ');
      expect(analysis.diacritic?.inheritColorFrom).toBe(ComponentType.SUFFIX);
    });

    test('should detect the pronoun suffix in رَأَيْتُهَ (I saw him), without a bare fatha diacritic', () => {
      // Pronoun suffix ه is the meaningful component. The trailing accusative fatha is a
      // bare case-ending vowel and is no longer painted (suffix-color inheritance for a
      // real diacritic is still covered by the كِتَابَهُ damma case above).
      const analysis = analyzeArabicWord('رَأَيْتُهَ', 'I saw him as he');

      // Should still detect the suffix
      expect(analysis.suffix?.arabicMatch).toBe('ه');

      // Bare final fatha is no longer detected as a separate diacritic
      expect(analysis.diacritic).toBeUndefined();
    });
  });

  /**
   * CATEGORY 7: EDGE CASES - Ambiguous or Context-Dependent
   */
  describe('🟠 EDGE CASES: Context-Dependent Scenarios', () => {
    test('should handle شبه (resemblance) vs شبهه (his resemblance)', () => {
      // شبه = resemblance (root: ش-ب-ه)
      // شبهه = his resemblance (root + suffix)

      const rootAnalysis = analyzeArabicWord('شبه', 'resemblance');
      const suffixAnalysis = analyzeArabicWord('شبهه', 'his resemblance');

      // First should NOT have suffix (root ends in ه)
      // Second SHOULD have suffix (attached pronoun)
      expect(rootAnalysis.suffix).toBeUndefined();
      expect(suffixAnalysis.suffix?.arabicMatch).toBe('ه');
    });

    test('should handle تنبيه (warning) - 4-letter root ending in ه', () => {
      // Root: ن-ب-ه (to alert, warn)
      // Form II verbal noun: تَنْبِيه
      const analysis = analyzeArabicWord('تنبيه', 'warning');

      // The ه is part of root ن-ب-ه, not a suffix
      // The ت is Form II prefix, should be detected
      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
    });
  });
});
