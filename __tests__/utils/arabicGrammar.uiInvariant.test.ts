/**
 * UI-truth gate. Optimizing the analyzer is worthless if the rendered output is broken,
 * so this test runs the **full pipeline the user runs** and asserts visual symmetry:
 *
 *   analyzer → formatWordAnalysis → (Arabic side: reconstructedArabic.segments)
 *                                  → (English side: generateColorCodedSegments)
 *
 * Invariant: for every component the analyzer keeps in `WordAnalysis` (prefix/suffix/infix),
 * the user must see BOTH a colored Arabic span AND at least one colored English span on
 * screen. A component painted on one side only is a P0 visual bug.
 *
 * The legacy benchmark (arabicWordAnalysis.dbBenchmark.test.ts) scores `WordAnalysis`
 * shape against a labeled corpus — useful, but blind to render-time asymmetries. This
 * gate fills that gap. Tune the analyzer against this metric, not the legacy one.
 */
import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';

import { ALL_DB_CASES } from '@/__tests__/fixtures/grammarGroundTruth.db';
import { Colors } from '@/constants/colors';
import {
  analyzeArabicWord,
  computeColoredSegments,
  formatWordAnalysis,
  normalizeArabic,
  shouldInjectBracket,
} from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';

const colors = Colors.light;
const DEFAULT_ARABIC_COLOR = colors.arabicText;
const DEFAULT_ENGLISH_COLOR = colors.text;
const DEFAULT_COLOR_SET = new Set([DEFAULT_ARABIC_COLOR, DEFAULT_ENGLISH_COLOR, colors.englishText]);

interface AsymmetryReport {
  arabic: string;
  english: string;
  components: { type: string; arabicMatch: string; englishMatches: string[] }[];
  arabicColoredSpans: { text: string; color: string; type: string }[];
  englishColoredSpans: { text: string; color: string }[];
  reason: string;
}

function isColoredSpan(color: string): boolean {
  return !DEFAULT_COLOR_SET.has(color);
}

describe('Arabic grammar — UI-truth gate', () => {
  test('every analyzer component renders on both sides (Arabic + English)', () => {
    const failures: AsymmetryReport[] = [];
    let totalCases = 0;
    let casesWithComponents = 0;
    let componentsExamined = 0;
    let componentsPaired = 0;

    for (const c of ALL_DB_CASES) {
      totalCases++;
      // Mirror the actual UI pipeline (hooks/vocabulary/useArabicWordAnalysis.ts):
      // bracket injection → analyze with injected english → format from that analysis.
      // The Arabic side (computeColoredSegments) injects internally, so passing raw english
      // to both code paths is the same call shape used in production.
      const normalized = normalizeArabic(c.arabic);
      const inject = shouldInjectBracket(normalized, c.english, c.arabic);
      const processedEnglish = inject ? `[the] ${c.english}` : c.english;
      const analysis = analyzeArabicWord(c.arabic, processedEnglish);
      if (!analysis.hasComponents) continue;
      casesWithComponents++;

      const arabicSegments = computeColoredSegments(c.arabic, c.english, colors);
      const formatted = formatWordAnalysis(analysis);
      const englishSegments = generateColorCodedSegments({
        text: c.english,
        formattedAnalysis: formatted,
        analysis,
        colors,
        defaultColor: DEFAULT_ENGLISH_COLOR,
      });

      const arabicColors = new Set(arabicSegments.filter(s => isColoredSpan(s.color)).map(s => s.color));
      const englishColors = new Set(englishSegments.filter(s => isColoredSpan(s.color)).map(s => s.color));

      // Pairing invariant via color: every distinct non-default color on the Arabic side
      // must appear on the English side, and vice-versa. Colors are role-unique in the theme,
      // so a color present on one side but not the other is a literal asymmetric paint.
      const arabicOnly = [...arabicColors].filter(c => !englishColors.has(c));
      const englishOnly = [...englishColors].filter(c => !arabicColors.has(c));

      const componentCount = analysis.prefixes.length + (analysis.infix ? 1 : 0) + (analysis.suffix ? 1 : 0);
      componentsExamined += componentCount;
      if (arabicOnly.length === 0 && englishOnly.length === 0) {
        componentsPaired += componentCount;
        continue;
      }
      failures.push({
        arabic: c.arabic,
        english: c.english,
        components: [
          ...analysis.prefixes.map(p => ({ type: 'prefix', arabicMatch: p.arabicMatch, englishMatches: p.englishMatches })),
          ...(analysis.infix ? [{ type: 'infix', arabicMatch: analysis.infix.arabicMatch, englishMatches: analysis.infix.englishMatches }] : []),
          ...(analysis.suffix ? [{ type: 'suffix', arabicMatch: analysis.suffix.arabicMatch, englishMatches: analysis.suffix.englishMatches }] : []),
        ],
        arabicColoredSpans: arabicSegments.filter(s => isColoredSpan(s.color)).map(s => ({ text: s.text, color: s.color, type: s.type })),
        englishColoredSpans: englishSegments.filter(s => isColoredSpan(s.color)).map(s => ({ text: s.text, color: s.color })),
        reason: `arabicOnly=[${arabicOnly.join(',')}] englishOnly=[${englishOnly.join(',')}]`,
      });
    }

    const pairingRate = componentsExamined > 0 ? componentsPaired / componentsExamined : 1;
    const summary = {
      totalCases,
      casesWithComponents,
      componentsExamined,
      componentsPaired,
      asymmetricComponents: componentsExamined - componentsPaired,
      pairingRate,
      failures: failures.slice(0, 50),
    };
    fs.writeFileSync('/tmp/ui-asymmetry.json', JSON.stringify(summary, null, 2));

    console.log(
      `\n  UI pairing rate: ${(pairingRate * 100).toFixed(2)}% (${componentsPaired}/${componentsExamined}); asymmetric=${componentsExamined - componentsPaired}; full report at /tmp/ui-asymmetry.json`,
    );

    // Hard invariant: zero asymmetric paints. Set ratchet-style; tighten in lockstep with the analyzer.
    expect(pairingRate).toBeGreaterThanOrEqual(1.0);
  });
});
