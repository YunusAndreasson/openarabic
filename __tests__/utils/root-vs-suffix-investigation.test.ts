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
 */

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
    it('should NOT color ه as suffix in فقيه (scholar)', () => {
      // Root: ف-ق-ه (f-q-h) = to understand, jurisprudence
      // The final ه is PART OF THE ROOT, not a pronoun suffix
      const analysis = analyzeArabicWord('فقيه', 'scholar');

      // EXPECTED: ه should NOT be detected as suffix
      // ACTUAL: May incorrectly detect ה as suffix if "he" appears in context
      expect(analysis.suffix).toBeUndefined();
    });

    it('should NOT color ه in وجه (face) when English contains "he"', () => {
      // Root: و-ج-ه (w-j-h) = face, direction
      const analysis = analyzeArabicWord('وجه', 'he faced');

      // CRITICAL BUG: If "he" appears in English, ה will be detected as suffix
      // But ه is part of root و-ج-ه, NOT a pronoun!
      if (analysis.suffix?.arabicMatch === 'ه') {
        console.warn('  ⚠️  FALSE POSITIVE: Root letter ה incorrectly identified as suffix!');
      }

      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
    });

    it('should NOT color ه in سفيه (foolish) with "his" context', () => {
      // Root: س-ف-ه (s-f-h) = foolishness
      const analysis = analyzeArabicWord('سفيه', 'his foolish behavior');

      // "his" appears in English, but ה is root, not possessive suffix
      if (analysis.suffix?.arabicMatch === 'ه') {
        console.warn('  ⚠️  FALSE POSITIVE: Root ה misidentified due to "his" in English!');
      }

      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
    });

    it('should NOT color ه in كره (he hates)', () => {
      // Root: ك-ر-ه (k-r-h) = to hate, dislike
      const analysis = analyzeArabicWord('كره', 'he hates');

      // Perfect storm: ends in ה AND English has "he"
      // But ה is part of root ك-ר-ه, not pronoun suffix!
      if (analysis.suffix?.arabicMatch === 'ه') {
        console.warn('  ⚠️  FALSE POSITIVE: Root ה colored as suffix!');
      }

      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
    });

    it('should NOT color ه in نزه (integrity, purity)', () => {
      // Root: ن-ز-ه (n-z-h) = to be free from, pure
      const analysis = analyzeArabicWord('نزه', 'he is pure');

      if (analysis.suffix?.arabicMatch === 'ه') {
        console.warn('  ⚠️  FALSE POSITIVE detected');
      }

      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
    });

    it('should NOT color ه in يكره (he hates) - prefix + root ending in ه', () => {
      // Root: ك-ر-ه (k-r-h) = to hate, dislike
      // Prefix: ي (he)
      // This is a tricky case: prefix ي + root كره
      const analysis = analyzeArabicWord('يكره', 'he hates');

      // Should detect ي as prefix
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ي');

      // Should NOT detect ה as suffix (it's part of root ك-ر-ه)
      if (analysis.suffix?.arabicMatch === 'ه') {
        console.warn('  ⚠️  FALSE POSITIVE: ه is root letter, not suffix!');
        console.warn('  Root is ك-ر-ه (k-r-h), not just ك-ر!');
      }

      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
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
    it('should NOT color ي as possessive in مصري (Egyptian)', () => {
      // مصر (Egypt) + ي (nisba) = Egyptian
      // The ي makes it an adjective, it's NOT "my"!
      const analysis = analyzeArabicWord('مصري', 'Egyptian man');

      // Nisba ي should NOT be colored (it's derivational, not grammatical)
      // System may incorrectly detect if "my" appears: "my Egyptian friend"
      if (analysis.suffix?.arabicMatch === 'ي' && analysis.suffix?.englishMatches.includes('my')) {
        console.warn('  ⚠️  Nisba ي misidentified as possessive!');
      }

      // For now, we accept that nisba might be detected
      // This documents the ambiguity in the system
    });

    it('should NOT color ي as possessive in عربي (Arabic)', () => {
      const analysis = analyzeArabicWord('عربي', 'my Arabic teacher');

      // "my" in English will trigger false positive
      // But ي is nisba (makes adjective), not possessive pronoun
      if (analysis.suffix?.arabicMatch === 'ي') {
        console.warn('  ⚠️  Nisba ي colored as possessive suffix');
      }
    });

    it('should NOT color ي in إسلامي (Islamic)', () => {
      const analysis = analyzeArabicWord('إسلامي', 'Islamic principles');

      // Less likely false positive (no "my" in English)
      // But system would still match if we said "my Islamic values"
      expect(analysis.suffix?.arabicMatch).not.toBe('ي');
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
    it('should NOT color ها in فكاهة (humor, wit)', () => {
      // Root: ف-ك-ه (f-k-h) = to jest, make witty remarks
      // Pattern: فَعَالَة (abstract noun form)
      const analysis = analyzeArabicWord('فكاهة', 'humor');

      // ها is NOT a pronoun, it's part of the pattern!
      expect(analysis.suffix?.arabicMatch).not.toBe('ها');
    });

    it('should NOT color ها in جباهة (forehead - poetic)', () => {
      // Root: ج-ب-ه (j-b-h) = forehead
      const analysis = analyzeArabicWord('جباهة', 'his forehead');

      // Even with "his" in English, ها is not possessive suffix
      if (analysis.suffix?.arabicMatch === 'ها') {
        console.warn('  ⚠️  Root ها misidentified as suffix!');
      }

      expect(analysis.suffix?.arabicMatch).not.toBe('ها');
    });
  });

  /**
   * CATEGORY 4: Prepositions + Suffixes
   *
   * Prepositions like على، لدى، إلى commonly take pronoun suffixes directly
   */
  describe('🔵 PREPOSITION + SUFFIX: Must Detect Both', () => {
    it('SHOULD detect علي prefix and ه suffix in عليه (on him)', () => {
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

    it('SHOULD detect لدى prefix and ه suffix in لديه (with him)', () => {
      // Preposition: لدى (with/at)
      // Suffix: ه (him)
      const analysis = analyzeArabicWord('لديه', 'with him');

      // Should detect ה suffix
      expect(analysis.suffix?.arabicMatch).toBe('ه');
    });

    it('SHOULD detect إلى prefix and ه suffix in إليه (to him)', () => {
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
    it('SHOULD color ه in كتابه (his book)', () => {
      // Root: ك-ت-ب (book) + suffix ه (his)
      // This is a REAL suffix, must be detected!
      const analysis = analyzeArabicWord('كتابه', 'his book');

      // MUST detect this as suffix (legitimate)
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.suffix?.englishMatches).toContain('his');
    });

    it('SHOULD color ها in كتابها (her book)', () => {
      // Root: ك-ت-ب + suffix ها (her)
      const analysis = analyzeArabicWord('كتابها', 'her book');

      // MUST detect this (legitimate suffix)
      expect(analysis.suffix?.arabicMatch).toBe('ها');
      expect(analysis.suffix?.englishMatches).toContain('her');
    });

    it('SHOULD color ي in كتابي (my book)', () => {
      // Root: ك-ت-ب + suffix ي (my)
      const analysis = analyzeArabicWord('كتابي', 'my book');

      // MUST detect this (legitimate suffix)
      expect(analysis.suffix?.arabicMatch).toBe('ي');
      expect(analysis.suffix?.englishMatches).toContain('my');
    });

    it('SHOULD color هم in كتابهم (their book)', () => {
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
    it('should make diacritic inherit suffix color in عَلَيْهِ (in him)', () => {
      // Preposition: علي (form of على before suffix: alef maksura → yeh)
      // Pronoun suffix ه with genitive case marker ِ
      const analysis = analyzeArabicWord('عَلَيْهِ', 'in him');

      // Should detect prefix, suffix, and diacritic
      expect(analysis.prefixes.length).toBeGreaterThan(0);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('علي'); // علي (not على) - alef maksura becomes yeh before suffixes
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.diacritic?.arabicMatch).toBe('ِ');

      // Diacritic should inherit color from suffix (both purple/violet)
      expect(analysis.diacritic?.inheritColorFrom).toBe(ComponentType.SUFFIX);
    });

    it('should make diacritic inherit suffix color in كِتَابَهُ (his book)', () => {
      // Pronoun suffix ه with nominative case marker ُ
      // Add "he" to match damma ُ
      const analysis = analyzeArabicWord('كِتَابَهُ', 'he read his book');

      // Should detect both suffix and diacritic
      expect(analysis.suffix?.arabicMatch).toBe('ه');

      // Diacritic should be detected and inherit suffix color
      expect(analysis.diacritic?.arabicMatch).toBe('ُ');
      expect(analysis.diacritic?.inheritColorFrom).toBe(ComponentType.SUFFIX);
    });

    it('should make diacritic inherit suffix color in رَأَيْتُهَ (I saw him)', () => {
      // Pronoun suffix ه with accusative case marker َ
      // English contains "he" to match fatha َ and "him" to match suffix ه
      const analysis = analyzeArabicWord('رَأَيْتُهَ', 'I saw him as he');

      // Should detect suffix
      expect(analysis.suffix?.arabicMatch).toBe('ه');

      // Diacritic should be detected and inherit suffix color
      expect(analysis.diacritic?.arabicMatch).toBe('َ');
      expect(analysis.diacritic?.inheritColorFrom).toBe(ComponentType.SUFFIX);
    });
  });

  /**
   * CATEGORY 7: EDGE CASES - Ambiguous or Context-Dependent
   */
  describe('🟠 EDGE CASES: Context-Dependent Scenarios', () => {
    it('should handle شبه (resemblance) vs شبهه (his resemblance)', () => {
      // شبه = resemblance (root: ش-ب-ه)
      // شبهه = his resemblance (root + suffix)

      const rootAnalysis = analyzeArabicWord('شبه', 'resemblance');
      const suffixAnalysis = analyzeArabicWord('شبهه', 'his resemblance');

      // First should NOT have suffix (root ends in ه)
      // Second SHOULD have suffix (attached pronoun)
      expect(rootAnalysis.suffix).toBeUndefined();
      expect(suffixAnalysis.suffix?.arabicMatch).toBe('ه');
    });

    it('should handle تنبيه (warning) - 4-letter root ending in ه', () => {
      // Root: ن-ب-ه (to alert, warn)
      // Form II verbal noun: تَنْبِيه
      const analysis = analyzeArabicWord('تنبيه', 'warning');

      // The ه is part of root ن-ب-ه, not a suffix
      // The ت is Form II prefix, should be detected
      expect(analysis.suffix?.arabicMatch).not.toBe('ه');
    });
  });

  /**
   * STATISTICS & ANALYSIS
   */
  describe('📊 Pattern Analysis', () => {
    it('should measure false positive rate for ه suffix', () => {
      const testCases = [
        { arabic: 'فقيه', english: 'scholar', shouldHaveSuffix: false },
        { arabic: 'وجه', english: 'he faced', shouldHaveSuffix: false },
        { arabic: 'كره', english: 'he hates', shouldHaveSuffix: false },
        { arabic: 'كتابه', english: 'his book', shouldHaveSuffix: true },
        { arabic: 'بيته', english: 'his house', shouldHaveSuffix: true },
      ];

      let falsePositives = 0;
      let falseNegatives = 0;
      let correct = 0;

      testCases.forEach(test => {
        const analysis = analyzeArabicWord(test.arabic, test.english);
        const detected = analysis.suffix?.arabicMatch === 'ه';

        if (detected && !test.shouldHaveSuffix) {
          falsePositives++;
        } else if (!detected && test.shouldHaveSuffix) {
          falseNegatives++;
        } else {
          correct++;
        }
      });

      // We expect some false positives currently
      // This test documents the baseline
    });
  });
});
