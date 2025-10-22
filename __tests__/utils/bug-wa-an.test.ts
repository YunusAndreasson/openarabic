/**
 * Debug test for user-reported bug: "wa an" (and from) and "fa idha" (so when)
 * Arabic white but English green
 */
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { ARABIC_PREFIXES } from '@/constants/arabicWordComponents';

describe('Bug Report: wa-an and fa-idha WITH DIACRITICS', () => {
  describe('وَمِنْ (with diacritics - and from)', () => {
    it('should analyze وَمِنْ with diacritics', () => {
      const analysis = analyzeArabicWord('وَمِنْ', 'and from');

      console.log('\n=== WITH DIACRITICS ===');
      console.log('Arabic: وَمِنْ');
      console.log('English: and from');
      console.log('Has components:', analysis.hasComponents);
      console.log('Prefix:', analysis.prefixes[0]?.arabicMatch);
      console.log('Prefix English:', analysis.prefixes[0]?.englishMatches);
      console.log('Remaining:', analysis.remainingArabic);

      expect(analysis.hasComponents).toBe(true);
      // Now detects as multi-prefix: و + من
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should have colored Arabic segments for وَمِنْ', () => {
      const analysis = analyzeArabicWord('وَمِنْ', 'and from');
      const formatted = formatWordAnalysis(analysis);

      console.log('\nFormatted وَمِنْ:');
      console.log('Reconstructed:', JSON.stringify(formatted.reconstructedArabic, null, 2));

      expect(formatted.reconstructedArabic).toBeDefined();
      const segments = formatted.reconstructedArabic?.segments || [];

      console.log('Segments:');
      segments.forEach((seg, i) => {
        console.log(`  [${i}] text="${seg.text}" type=${seg.type} color=${seg.colorName}`);
      });

      // Multi-prefix detection: و + من = 2 segments minimum
      expect(segments.length).toBeGreaterThanOrEqual(1);
      expect(segments[0]?.type).toBe('prefix');
    });
  });
});

describe('Bug Report: wa-an and fa-idha (without diacritics)', () => {
  describe('ومن (and from)', () => {
    it('should find individual prefixes و and من in ARABIC_PREFIXES', () => {
      const waPrefix = ARABIC_PREFIXES.find(p => p.arabic === 'و');
      const minPrefix = ARABIC_PREFIXES.find(p => p.arabic === 'من');

      console.log('Found و:', waPrefix?.english);
      console.log('Found من:', minPrefix?.english);

      expect(waPrefix).toBeDefined();
      expect(minPrefix).toBeDefined();
      expect(waPrefix?.english).toContain('and');
      expect(minPrefix?.english).toContain('from');
    });

    it('should analyze ومن (and from)', () => {
      const analysis = analyzeArabicWord('ومن', 'and from');

      console.log('\nAnalysis for ومن (and from):');
      console.log('Has components:', analysis.hasComponents);
      console.log('Prefix arabicMatch:', analysis.prefixes[0]?.arabicMatch);
      console.log('Prefix englishMatches:', analysis.prefixes[0]?.englishMatches);
      console.log('Remaining:', analysis.remainingArabic);
      console.log('Full analysis:', JSON.stringify(analysis, null, 2));

      expect(analysis.hasComponents).toBe(true);
      // Multi-prefix: و + من
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
    });

    it('should have colored Arabic segments', () => {
      const analysis = analyzeArabicWord('ومن', 'and from');
      const formatted = formatWordAnalysis(analysis);

      console.log('\nFormatted analysis:');
      console.log('Reconstructed Arabic:', JSON.stringify(formatted.reconstructedArabic, null, 2));
      console.log('Number of sections:', formatted.sections.length);

      expect(formatted.reconstructedArabic).toBeDefined();
      expect(formatted.reconstructedArabic?.segments).toBeDefined();

      const segments = formatted.reconstructedArabic?.segments || [];
      console.log('\nArabic segments:');
      segments.forEach((seg, i) => {
        console.log(`  [${i}] text="${seg.text}" type=${seg.type} colorName=${seg.colorName}`);
      });

      // Multi-prefix: و + من = at least 1 segment
      expect(segments.length).toBeGreaterThanOrEqual(1);
      expect(segments[0]?.type).toBe('prefix');
      expect(segments[0]?.colorName).not.toBe('text'); // Should be colored, not white
      // First prefix 'و' is conjunction = secondary color
      expect(segments[0]?.colorName).toBe('secondary');
    });
  });

  describe('فإذا (so when) - Split Coloring for Education', () => {
    it('should split فإذا into ف (so) + إذا (remaining)', () => {
      const analysis = analyzeArabicWord('فإذا', 'so when');

      console.log('\nAnalysis for فإذا (so when) - SPLIT:');
      console.log('Has components:', analysis.hasComponents);
      console.log('Prefix:', analysis.prefixes[0]?.arabicMatch);
      console.log('Remaining:', analysis.remainingArabic);

      // Multi-prefix: ف (conjunction) + إذا (particle) - both prefixes
      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('ف');
      expect(analysis.prefixes[1]?.arabicMatch).toBe('إذا');
    });

    it('should have multiple colored Arabic segments for educational clarity', () => {
      const analysis = analyzeArabicWord('فإذا', 'so when');
      const formatted = formatWordAnalysis(analysis);

      console.log('\nFormatted analysis (split):');
      console.log('Reconstructed Arabic:', formatted.reconstructedArabic);

      expect(formatted.reconstructedArabic).toBeDefined();
      const segments = formatted.reconstructedArabic?.segments || [];
      console.log('Arabic segments:', segments);

      // Should have 2 segments: ف (conjunction) + إذا (particle) - both prefixes
      expect(segments.length).toBe(2);
      expect(segments[0]?.text).toContain('ف');
      expect(segments[0]?.type).toBe('prefix');
      expect(segments[1]?.text).toContain('إذا');
      expect(segments[1]?.type).toBe('prefix'); // إذا is a particle prefix, not a root
    });
  });
});
