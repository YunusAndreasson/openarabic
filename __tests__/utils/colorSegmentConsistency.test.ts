/**
 * Color Segment Consistency Tests
 *
 * The rule is simple: if the user sees N colored parts in Arabic,
 * they must see exactly N colored parts in the English tooltip.
 *
 * Tests every word from the database (fixture: allWords.json).
 * Regenerate fixture: npx tsx scripts/find-color-segment-mismatches.ts
 */

import { describe, expect, test } from '@jest/globals';

import { Colors } from '@/constants/colors';
import { shouldInjectBracket } from '@/utils/arabicAnalysis/componentDetection';
import { formatWordAnalysis } from '@/utils/arabicAnalysis/colorSegments';
import { normalizeArabic } from '@/utils/arabicAnalysis/normalization';
import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

import allWords from '../fixtures/allWords.json';

const colors = Colors.dark;

// Build test cases: for every word with coloring, check Arabic vs English count
const coloredWords = allWords.filter(({ arabic, english }) => {
  const segs = computeColoredSegments(arabic, english, colors);
  return segs.length > 1 || segs.some(s => s.type !== 'root');
});

describe('Every colored word must have matching Arabic and English color counts', () => {
  test.each(coloredWords)(
    '$arabic ($english)',
    ({ arabic, english }) => {
      // Arabic side: count distinct non-default colors the user sees
      const segs = computeColoredSegments(arabic, english, colors);
      const defaultColors = new Set([colors.arabicText, colors.text]);
      const arabicColoredCount = new Set(
        segs.map(s => s.color).filter(c => !defaultColors.has(c)),
      ).size;

      // English side: what the tooltip shows (must use same bracket injection as Arabic side)
      const norm = normalizeArabic(arabic);
      const processedEnglish = shouldInjectBracket(norm, english, arabic)
        ? `[the] ${english}`
        : english;
      const analysis = analyzeArabicWord(arabic, processedEnglish);

      // If no components detected, Arabic should also have 0 colored segments
      if (!analysis?.hasComponents) {
        expect(arabicColoredCount).toBe(0);
        return;
      }

      const formatted = formatWordAnalysis(analysis);
      const englishColoredCount = formatted.sections.filter(s => s.type === 'components').length;

      expect(arabicColoredCount).toBe(englishColoredCount);
    },
  );

  test('segments always reconstruct to the original word', () => {
    for (const { arabic, english } of coloredWords) {
      const segs = computeColoredSegments(arabic, english, colors);
      if (segs.length <= 1) continue;
      const joined = segs.map(s => s.text).join('');
      expect(joined).toBe(arabic);
    }
  });
});
