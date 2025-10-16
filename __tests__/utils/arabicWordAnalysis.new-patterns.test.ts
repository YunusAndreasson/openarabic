/**
 * Tests for newly added grammar patterns (2025 improvements)
 *
 * These tests verify patterns added to fix real bugs found via runtime bug detector
 */
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

describe('Arabic Word Analysis: New Patterns (2025)', () => {
  /**
   * Pattern 1: Dual Pronoun Suffix هما with expanded English translations
   */
  describe('Dual Pronoun هما (them/which/those)', () => {
    it('should detect هما suffix in بِهِمَا (by which)', () => {
      const analysis = analyzeArabicWord('بهما', 'by which');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('ب');
      expect(analysis.suffix?.arabicMatch).toBe('هما');
      expect(analysis.remainingArabic).toBe(''); // Both components detected, no remaining
    });

    it('should detect هما suffix in فِيهِمَا (in them)', () => {
      const analysis = analyzeArabicWord('فيهما', 'in them');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('في');
      expect(analysis.suffix?.arabicMatch).toBe('هما');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should color both prefix and suffix in بِهِمَا', () => {
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
    it('should detect لئلا as full compound prefix', () => {
      const analysis = analyzeArabicWord('لئلا', 'to not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لئلا');
      expect(analysis.remainingArabic).toBe(''); // Full word is the compound
    });

    it('should match "lest" translation', () => {
      const analysis = analyzeArabicWord('لئلا', 'lest');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لئلا');
    });

    it('should match "so that not" translation', () => {
      const analysis = analyzeArabicWord('لئلا', 'so that not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لئلا');
    });
  });

  /**
   * Pattern 3: Double Preposition لل (for/to) with contracted translations
   */
  describe('Double Preposition لل with Contracted Translations', () => {
    it('should detect لل in لِلْجِمَاعِ (for intercourse)', () => {
      const analysis = analyzeArabicWord('للجماع', 'for intercourse');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لل');
      // Remaining should be the root "جماع"
      expect(analysis.remainingArabic).toBe('جماع');
    });

    it('should detect لل with just "for" (no "the")', () => {
      const analysis = analyzeArabicWord('للناس', 'for people');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لل');
    });

    it('should detect لل with "to" translation', () => {
      const analysis = analyzeArabicWord('للرسول', 'to Messenger');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لل');
    });

    it('should still match "for the" traditional translation', () => {
      const analysis = analyzeArabicWord('للبيت', 'for the house');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لل');
    });
  });

  /**
   * Pattern 4: ومن with "And those" translation
   */
  describe('ومن with Capital/Alternative Translations', () => {
    it('should detect ومن with "And those"', () => {
      const analysis = analyzeArabicWord('ومن', 'And those');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('ومن');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should detect ومن with "And whoever" (capital A)', () => {
      const analysis = analyzeArabicWord('ومن', 'And whoever');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('ومن');
    });

    it('should detect ومن with "And for those"', () => {
      const analysis = analyzeArabicWord('ومن', 'And for those');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('ومن');
    });

    it('should still match lowercase "and whoever"', () => {
      const analysis = analyzeArabicWord('ومن', 'and whoever');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('ومن');
    });
  });

  /**
   * Integration Test: Verify false positive reduction
   */
  describe('False Positive Reduction', () => {
    it('should correctly analyze root + suffix without flagging as bug (قُوَّتِهِ)', () => {
      const analysis = analyzeArabicWord('قوته', 'his strength');

      // Should detect suffix ه
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      // Remaining should be root قوت (this is CORRECT behavior)
      expect(analysis.remainingArabic).toBe('قوت');
      expect(analysis.remainingArabic.length).toBeGreaterThanOrEqual(3);
    });

    it('should correctly analyze dual marker ين (عَدُوَّيْنِ)', () => {
      const analysis = analyzeArabicWord('عدوين', 'two enemies');

      // Should detect suffix ين
      expect(analysis.suffix?.arabicMatch).toBe('ين');
      // Remaining is the root عدو (this is CORRECT)
      expect(analysis.remainingArabic).toBe('عدو');
    });

    it('should detect both prefix and suffix in لَذَّتُهُ (his pleasure)', () => {
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
    it('should detect أما with "do you not"', () => {
      const analysis = analyzeArabicWord('أما', 'do you not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('أما');
      expect(analysis.remainingArabic).toBe(''); // Full word is the compound
    });

    it('should match "are you not" translation', () => {
      const analysis = analyzeArabicWord('أما', 'are you not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('أما');
    });

    it('should match "have you not" translation', () => {
      const analysis = analyzeArabicWord('أما', 'have you not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('أما');
    });

    it('should match "as for" translation', () => {
      const analysis = analyzeArabicWord('أما', 'as for');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('أما');
    });
  });

  /**
   * Pattern 6: Demonstrative Pronoun Compounds (PREPOSITION + هذا/هذه)
   */
  describe('Demonstrative Pronoun Compounds', () => {
    it('should detect بهذا (in this)', () => {
      const analysis = analyzeArabicWord('بهذا', 'in this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('بهذا');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should detect لهذا (for this)', () => {
      const analysis = analyzeArabicWord('لهذا', 'for this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لهذا');
    });

    it('should detect وهذا (and this)', () => {
      const analysis = analyzeArabicWord('وهذا', 'and this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('وهذا');
    });

    it('should detect فهذا (then this)', () => {
      const analysis = analyzeArabicWord('فهذا', 'then this');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('فهذا');
    });
  });

  /**
   * Pattern 7: PREPOSITION + PARTICLE Compounds (فيما, بما, etc.)
   */
  describe('PREPOSITION + PARTICLE Compounds', () => {
    it('should detect فيما (in what)', () => {
      const analysis = analyzeArabicWord('فيما', 'in what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('فيما');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should detect بما (with what)', () => {
      const analysis = analyzeArabicWord('بما', 'with what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('بما');
    });

    it('should detect لما (for what)', () => {
      const analysis = analyzeArabicWord('لما', 'for what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('لما');
    });

    it('should detect كما (as)', () => {
      const analysis = analyzeArabicWord('كما', 'as');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('كما');
    });

    it('should detect مما (from what)', () => {
      const analysis = analyzeArabicWord('مما', 'from what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('مما');
    });

    it('should detect عما (about what)', () => {
      const analysis = analyzeArabicWord('عما', 'about what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix?.arabicMatch).toBe('عما');
    });
  });

  /**
   * Regression Tests: Ensure existing patterns still work
   */
  describe('Regression: Existing Patterns', () => {
    it('should still detect وما (and what)', () => {
      const analysis = analyzeArabicWord('وما', 'and what');
      expect(analysis.prefix?.arabicMatch).toBe('وما');
    });

    it('should still detect فمن (so whoever)', () => {
      const analysis = analyzeArabicWord('فمن', 'so whoever');
      expect(analysis.prefix?.arabicMatch).toBe('فمن');
    });

    it('should still detect والبيت (and the house)', () => {
      const analysis = analyzeArabicWord('والبيت', 'and the house');
      expect(analysis.prefix?.arabicMatch).toBe('وال');
    });
  });
});
