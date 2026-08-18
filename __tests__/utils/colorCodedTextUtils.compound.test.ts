/**
 * Color-Coded Text Utils - Compound Tests
 *
 * Tests compound multi-prefix English coloring logic.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { MOCK_GRAMMAR_COLORS } from '@/__tests__/setup/mockGrammarColors';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { createThemeColorsMock } from '@/__tests__/helpers/themeMocks';

const mockColors = createThemeColorsMock();

describe('Multi-Prefix English Coloring', () => {
  test('should color multi-prefix components with different colors (وعن → "and from")', () => {
    const analysis = analyzeArabicWord('وعن', 'and from');
    const formatted = formatWordAnalysis(analysis);

    const result = generateColorCodedSegments({
      text: 'and from',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // Should color the phrase with multi-prefix detection
    expect(result.length).toBeGreaterThan(0);

    // Multi-prefix: و (and) = conjunction, عن (from) = preposition
    const conjunctionSegments = result.filter(s => s.color === mockColors.grammar.conjunction);
    const prepositionSegments = result.filter(s => s.color === mockColors.grammar.preposition);

    // Should have "and" in secondary color (conjunction)
    const conjunctionText = conjunctionSegments
      .map(s => s.text)
      .join(' ')
      .toLowerCase();
    expect(conjunctionText).toContain('and');

    // Should have "from" in warning color (preposition)
    const prepositionText = prepositionSegments
      .map(s => s.text)
      .join(' ')
      .toLowerCase();
    expect(prepositionText).toContain('from');
  });

  test('should color multi-prefix with suffix (وعنه → "and from him")', () => {
    const analysis = analyzeArabicWord('وعنه', 'and from him');
    const formatted = formatWordAnalysis(analysis);

    const result = generateColorCodedSegments({
      text: 'and from him',
      formattedAnalysis: formatted,
      analysis,
      colors: mockColors,
      defaultColor: mockColors.text,
    });

    // Should have at least 3 colors: conjunction (و), preposition (عن), possessive (ه)
    const colors = new Set(result.map(s => s.color));
    expect(colors.size).toBeGreaterThan(1);

    // Multi-prefix: و (and) = conjunction
    const conjunctionSegments = result.filter(s => s.color === mockColors.grammar.conjunction);
    const conjunctionText = conjunctionSegments
      .map(s => s.text)
      .join(' ')
      .toLowerCase();
    expect(conjunctionText).toContain('and');

    // Multi-prefix: عن (from) = preposition
    const prepositionSegments = result.filter(s => s.color === mockColors.grammar.preposition);
    const prepositionText = prepositionSegments
      .map(s => s.text)
      .join(' ')
      .toLowerCase();
    expect(prepositionText).toContain('from');

    // Suffix: ه (him) = possessive
    const suffixSegments = result.filter(s => s.color === mockColors.grammar.possessive);
    const suffixText = suffixSegments
      .map(s => s.text)
      .join('')
      .toLowerCase();
    expect(suffixText).toContain('him');
  });
});
