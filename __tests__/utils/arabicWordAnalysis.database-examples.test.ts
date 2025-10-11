/**
 * Tests for grammar rules based on real database examples
 * These test cases come from analyzing actual words in our database
 */
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { ARABIC_PREFIXES } from '@/constants/arabicWordComponents';

describe('Database Example Grammar Rules', () => {
  describe('Compound Prefix: فمن (fa-man)', () => {
    it('should have فمن compound prefix entries in ARABIC_PREFIXES', () => {
      const famanEntries = ARABIC_PREFIXES.filter(p => p.arabic === '^فمن');
      expect(famanEntries.length).toBeGreaterThan(0);

      // Should have both preposition ("so from") and particle ("so whoever") versions
      const hasWhoeverMeaning = famanEntries.some(entry =>
        entry.english.some(e => e.includes('whoever') || e.includes('who'))
      );
      expect(hasWhoeverMeaning).toBe(true);
    });

    it('should analyze فَمَنْ (and whoever) as compound prefix', () => {
      const analysis = analyzeArabicWord('فمن', 'and whoever');

      console.log('Analysis for فمن (and whoever):');
      console.log('Prefix:', analysis.prefix);
      console.log('Has components:', analysis.hasComponents);

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('فمن');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should color-code "and whoever" in English', () => {
      const analysis = analyzeArabicWord('فمن', 'and whoever');
      const formatted = formatWordAnalysis(analysis);

      const componentSection = formatted.sections.find(s => s.type === 'components');
      expect(componentSection).toBeDefined();
      expect(componentSection?.englishPart).toContain('whoever');
    });
  });

  describe('Compound Prefix: فإنما (fa-innama)', () => {
    it('should detect فإنما compound prefix in ARABIC_PREFIXES', () => {
      const fainnama = ARABIC_PREFIXES.find(p => p.arabic === '^فإنما');
      expect(fainnama).toBeDefined();
      expect(fainnama?.english).toContain('so only');
    });

    it('should analyze فَإِنَّمَا (only truly) as compound prefix', () => {
      const analysis = analyzeArabicWord('فإنما', 'only truly');

      console.log('\nAnalysis for فإنما (only truly):');
      console.log('Prefix:', analysis.prefix);
      console.log('Has components:', analysis.hasComponents);

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('فإنما');
      expect(analysis.remainingArabic).toBe('');
    });

    it('should color-code "only truly" in English', () => {
      const analysis = analyzeArabicWord('فإنما', 'only truly');
      const formatted = formatWordAnalysis(analysis);

      const componentSection = formatted.sections.find(s => s.type === 'components');
      expect(componentSection).toBeDefined();
      expect(componentSection?.englishPart).toMatch(/only|truly/);
    });
  });

  describe('Standalone Particles', () => {
    it('should detect إنما as standalone particle', () => {
      const innama = ARABIC_PREFIXES.find(p => p.arabic === '^إنما');
      expect(innama).toBeDefined();
      expect(innama?.english).toContain('only');
    });

    it('should have من/مَنْ entries in ARABIC_PREFIXES', () => {
      // Check for both normalized (من) and diacritical (مَنْ) versions
      const manEntries = ARABIC_PREFIXES.filter(p => p.arabic === '^من' || p.arabic === '^مَنْ');
      expect(manEntries.length).toBeGreaterThan(0);

      // Should have particle ("who/whoever") meaning in at least one version
      const hasWhoMeaning = manEntries.some(entry =>
        entry.english.some(e => e.includes('who') || e.includes('whoever'))
      );
      expect(hasWhoMeaning).toBe(true);
    });
  });

  describe('Existing Compound Prefixes Still Work', () => {
    it('should still detect وعن (and from) correctly', () => {
      const analysis = analyzeArabicWord('وعن', 'and from');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('وعن');
      expect(analysis.prefix?.englishMatches).toContain('and from');
    });

    it('should still detect ومن (and from) correctly', () => {
      const analysis = analyzeArabicWord('ومن', 'and from');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('ومن');
    });
  });

  describe('Real-World Oath Examples', () => {
    it('should detect والله (by Allah / and by Allah)', () => {
      const analysisByAllah = analyzeArabicWord('والله', 'by Allah');

      expect(analysisByAllah.hasComponents).toBe(true);
      expect(analysisByAllah.prefix).toBeDefined();
      expect(analysisByAllah.prefix?.arabicMatch).toBe('و');

      // Should match "by" as one of the و alternatives
      const byMatch = analysisByAllah.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('by')
      );
      expect(byMatch).toBe(true);
    });

    it('should detect والسماء (and by the sky)', () => {
      const analysis = analyzeArabicWord('والسماء', 'and by the sky');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should detect compound و+ال
      const hasWaOrAl = analysis.prefix?.arabicMatch.includes('و') ||
                        analysis.prefix?.arabicMatch.includes('ال');
      expect(hasWaOrAl).toBe(true);
    });
  });

  describe('Preposition ب Compounds', () => {
    it('should detect بما (concerning what)', () => {
      const analysis = analyzeArabicWord('بما', 'concerning what');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match compound ب+ما
      const hasB = analysis.prefix?.arabicMatch.includes('ب');
      expect(hasB).toBe(true);
    });

    it('should detect بمقتضى (based on)', () => {
      const analysis = analyzeArabicWord('بمقتضى', 'based on');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('ب');

      // Should match "based" as one of the ب alternatives
      const basedMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('based')
      );
      expect(basedMatch).toBe(true);
    });
  });

  describe('Negation Patterns', () => {
    it('should detect لم in negation phrase', () => {
      const analysis = analyzeArabicWord('لم', 'does not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('لم');

      // Should match "does not" as one of the لم alternatives
      const doesNotMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('does') && m.toLowerCase().includes('not')
      );
      expect(doesNotMatch).toBe(true);
    });

    it('should detect ولا (and not)', () => {
      const analysis = analyzeArabicWord('ولا', 'and not');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match compound و+لا (may be "ولا" or just "و" depending on priority)
      const hasWaOrWaLa = analysis.prefix?.arabicMatch === 'ولا' || analysis.prefix?.arabicMatch === 'و';
      expect(hasWaOrWaLa).toBe(true);
    });
  });

  describe('Interrogative كم Examples', () => {
    it('should detect كم (how much)', () => {
      const analysis = analyzeArabicWord('كم', 'how much');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();
      expect(analysis.prefix?.arabicMatch).toBe('كم');

      // Should match "how much"
      const howMuchMatch = analysis.prefix?.englishMatches.some(m =>
        m.toLowerCase().includes('how') && m.toLowerCase().includes('much')
      );
      expect(howMuchMatch).toBe(true);
    });

    it('should detect وكم (and how many)', () => {
      const analysis = analyzeArabicWord('وكم', 'and how many');

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefix).toBeDefined();

      // Should match compound و+كم (may be "وكم" compound or separate components)
      const hasWaOrCompound =
        analysis.prefix?.arabicMatch === 'وكم' ||
        analysis.prefix?.arabicMatch === 'و' ||
        analysis.prefix?.englishMatches.some(m => m.toLowerCase().includes('how'));
      expect(hasWaOrCompound).toBe(true);
    });
  });
});
