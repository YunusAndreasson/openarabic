/**
 * Test for user-reported bug: Arabic white but English green
 * Tests consistency between Arabic coloring (modal display) and English coloring (tooltip)
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { createThemeColorsMock } from '@/__tests__/helpers/themeMocks';

const COLORS = createThemeColorsMock({
  tint: '#00FF00',
  warning: '#FFAA00',
  secondaryText: '#888888',
  text: '#000000',
  grammar: MOCK_GRAMMAR_COLORS,
});

describe('Modal-Tooltip Consistency Bug', () => {
  describe('وَمِنْ (and from) - User Report', () => {
    const arabic = 'وَمِنْ';
    const english = 'and from';

    test('should have components detected', () => {
      const analysis = analyzeArabicWord(arabic, english);

      expect(analysis.hasComponents).toBe(true);
      expect(analysis.prefixes.map(prefix => prefix.arabicMatch)).toEqual(['و', 'من']);
    });

    test('should have colored Arabic segments (modal display)', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const segments = formatted.reconstructedArabic?.segments || [];

      expect(segments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'prefix', colorName: 'grammar.conjunction' }),
          expect.objectContaining({ type: 'prefix' }),
        ]),
      );
      const prefixSegments = segments.filter(segment => segment.type === 'prefix');
      expect(prefixSegments).toHaveLength(2);
      expect(prefixSegments.every(segment => segment.colorName !== 'text')).toBe(true);
    });

    test.failing('colors من as a preposition when it means "from"', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);
      const minSegment = formatted.reconstructedArabic?.segments.find(segment =>
        segment.text.includes('م'),
      );

      expect(minSegment?.colorName).toBe('grammar.preposition');
    });

    test('should have colored English segments (tooltip)', () => {
      const analysis = analyzeArabicWord(arabic, english);
      const formatted = formatWordAnalysis(analysis);

      const coloredSegments = generateColorCodedSegments({
        text: english,
        formattedAnalysis: formatted,
        analysis,
        colors: COLORS,
        defaultColor: COLORS.text,
      });

      expect(coloredSegments.filter(segment => segment.color !== COLORS.text)).toHaveLength(2);
    });

    test('CONSISTENCY CHECK: Arabic and English should both be colored or both be white', () => {
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

      expect({ arabicIsColored, englishIsColored }).toEqual({
        arabicIsColored: true,
        englishIsColored: true,
      });
    });
  });

  describe('فإِذَا (so when) - User Report', () => {
    const arabic = 'فإِذَا';
    const english = 'so when';

    test('CONSISTENCY CHECK: Arabic and English both colored', () => {
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

      expect({ arabicIsColored, englishIsColored }).toEqual({
        arabicIsColored: true,
        englishIsColored: true,
      });
    });
  });
});
