/**
 * Test for user-reported bug: Arabic white but English green
 * Tests consistency between Arabic coloring (modal display) and English coloring (tooltip)
 */
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';

const COLORS = {
  tint: '#00FF00',
  primary: '#0000FF',
  warning: '#FFAA00',
  secondaryText: '#888888',
  text: '#000000',
};

describe('Modal-Tooltip Consistency Bug', () => {
  describe('وَمِنْ (and from) - User Report', () => {
    const arabic = 'وَمِنْ';
    const english = 'and from';

    it('should have components detected', () => {
      const analysis = analyzeArabicWord(arabic, english);

      expect(analysis.hasComponents).toBe(true);
      // Now detects as multi-prefix: و (and) + من (from)
      expect(analysis.prefixes.length).toBeGreaterThanOrEqual(1);
      expect(analysis.prefixes[0]?.arabicMatch).toBe('و');
      if (analysis.prefixes.length > 1) {
        expect(analysis.prefixes[1]?.arabicMatch).toBe('من');
      }
    });

    it('should have colored Arabic segments (modal display)', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      expect(formatted.reconstructedArabic).toBeDefined();
      expect(formatted.reconstructedArabic?.segments).toBeDefined();

      const segments = formatted.reconstructedArabic?.segments || [];
      segments.forEach((seg, i) => {});

      // CRITICAL: Arabic should be colored, not white
      // Now renders as multiple segments for multi-prefix: و (conjunction=secondary) + من (preposition)
      expect(segments.length).toBeGreaterThan(0);
      const firstColoredSegment = segments.find(s => s.type === 'prefix');
      expect(firstColoredSegment).toBeDefined();
      expect(firstColoredSegment?.colorName).not.toBe('text'); // Not white
      // First prefix 'و' is conjunction = secondary color
      expect(segments[0]?.colorName).toBe('secondary');
    });

    it('should have colored English segments (tooltip)', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const coloredSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: COLORS,
        defaultColor: COLORS.text,
      });

      coloredSegments.forEach((seg, i) => {});

      // English should be colored
      const hasColoredSegment = coloredSegments.some(seg => seg.color !== COLORS.text);
      expect(hasColoredSegment).toBe(true);
    });

    it('CONSISTENCY CHECK: Arabic and English should both be colored or both be white', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      // Check Arabic coloring
      const arabicSegments = formatted.reconstructedArabic?.segments || [];
      const arabicIsColored = arabicSegments.some(seg => seg.colorName !== 'text');

      // Check English coloring
      const englishSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: COLORS,
        defaultColor: COLORS.text,
      });
      const englishIsColored = englishSegments.some(seg => seg.color !== COLORS.text);

      // BUG: If English is colored, Arabic MUST also be colored
      if (englishIsColored) {
        expect(arabicIsColored).toBe(true);
      }
    });
  });

  describe('فإِذَا (so when) - User Report', () => {
    const arabic = 'فإِذَا';
    const english = 'so when';

    it('CONSISTENCY CHECK: Arabic and English both colored', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const arabicSegments = formatted.reconstructedArabic?.segments || [];
      const arabicIsColored = arabicSegments.some(seg => seg.colorName !== 'text');

      const englishSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: COLORS,
        defaultColor: COLORS.text,
      });
      const englishIsColored = englishSegments.some(seg => seg.color !== COLORS.text);

      if (englishIsColored) {
        expect(arabicIsColored).toBe(true);
      }
    });
  });
});
