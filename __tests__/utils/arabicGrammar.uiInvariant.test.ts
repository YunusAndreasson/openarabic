/**
 * UI-truth gate. Optimizing the analyzer is worthless if the rendered output is broken,
 * so this test runs the **full pipeline the user runs** and asserts visual symmetry:
 *
 *   analyzer → formatWordAnalysis → (Arabic side: computeColoredSegments)
 *                                  → (English side: generateColorCodedSegments)
 *
 * Three invariants are enforced:
 *
 * 1. **Pairing**: for every distinct non-default color the user sees on the Arabic side,
 *    the same color must appear on the English side, and vice-versa. A component painted
 *    on one side only is a P0 visual bug.
 * 2. **Single-word rule** (per CLAUDE.md): a translation that is one word must NEVER get
 *    grammar coloring, regardless of how the analyzer parsed the Arabic.
 * 3. **Reconstruction**: rendered Arabic segments concatenate back to the input word.
 *
 * Tested across two corpora:
 * - `ALL_DB_CASES` — 597 hand-labeled, bucket-stratified eval cases.
 * - `allWords.json` — 655 production words from the actual database, surfacing real cases
 *   the labeled corpus may not cover.
 *
 * The legacy benchmark (arabicWordAnalysis.dbBenchmark.test.ts) scores `WordAnalysis`
 * shape against a labeled corpus — useful, but blind to render-time asymmetries. This
 * gate fills that gap. Tune the analyzer against this metric, not the legacy one.
 */
import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';

import allWords from '@/__tests__/fixtures/allWords.json';
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
const DEFAULT_COLOR_SET = new Set([colors.arabicText, colors.text, colors.englishText]);
const isColoredSpan = (color: string) => !DEFAULT_COLOR_SET.has(color);

interface PairingFailure {
  arabic: string;
  english: string;
  arabicColoredSpans: { text: string; color: string; type: string }[];
  englishColoredSpans: { text: string; color: string }[];
  reason: string;
}

interface SingleWordFailure {
  arabic: string;
  english: string;
  coloredSpans: { text: string; color: string; type: string }[];
}

function checkPairing(
  arabic: string,
  english: string,
): { ok: boolean; failure?: PairingFailure; componentCount: number } {
  const normalized = normalizeArabic(arabic);
  const inject = shouldInjectBracket(normalized, english, arabic);
  const processedEnglish = inject ? `[the] ${english}` : english;
  const analysis = analyzeArabicWord(arabic, processedEnglish);
  if (!analysis.hasComponents) return { ok: true, componentCount: 0 };

  const arabicSegments = computeColoredSegments(arabic, english, colors);
  const formatted = formatWordAnalysis(analysis);
  const englishSegments = generateColorCodedSegments({
    text: english,
    formattedAnalysis: formatted,
    analysis,
    colors,
    defaultColor: colors.text,
  });

  const arabicColors = new Set(
    arabicSegments.filter(s => isColoredSpan(s.color)).map(s => s.color),
  );
  const englishColors = new Set(
    englishSegments.filter(s => isColoredSpan(s.color)).map(s => s.color),
  );
  const arabicOnly = [...arabicColors].filter(c => !englishColors.has(c));
  const englishOnly = [...englishColors].filter(c => !arabicColors.has(c));

  const componentCount =
    analysis.prefixes.length + (analysis.infix ? 1 : 0) + (analysis.suffix ? 1 : 0);
  if (arabicOnly.length === 0 && englishOnly.length === 0) {
    return { ok: true, componentCount };
  }
  return {
    ok: false,
    componentCount,
    failure: {
      arabic,
      english,
      arabicColoredSpans: arabicSegments
        .filter(s => isColoredSpan(s.color))
        .map(s => ({ text: s.text, color: s.color, type: s.type })),
      englishColoredSpans: englishSegments
        .filter(s => isColoredSpan(s.color))
        .map(s => ({ text: s.text, color: s.color })),
      reason: `arabicOnly=[${arabicOnly.join(',')}] englishOnly=[${englishOnly.join(',')}]`,
    },
  };
}

describe('Arabic grammar — UI-truth gate', () => {
  test('pairing invariant — labeled corpus (597 cases)', () => {
    const failures: PairingFailure[] = [];
    let examined = 0;
    let paired = 0;
    for (const c of ALL_DB_CASES) {
      const r = checkPairing(c.arabic, c.english);
      examined += r.componentCount;
      if (r.ok) {
        paired += r.componentCount;
      } else if (r.failure) {
        failures.push(r.failure);
      }
    }
    const rate = examined > 0 ? paired / examined : 1;
    fs.writeFileSync(
      '/tmp/ui-asymmetry.json',
      JSON.stringify(
        {
          corpus: 'labeled',
          examined,
          paired,
          asymmetric: examined - paired,
          rate,
          failures: failures.slice(0, 50),
        },
        null,
        2,
      ),
    );
    expect(rate).toBeGreaterThanOrEqual(1.0);
  });

  test('pairing invariant — production words (655 cases from real DB)', () => {
    const failures: PairingFailure[] = [];
    let examined = 0;
    let paired = 0;
    for (const w of allWords) {
      if (!w.arabic || !w.english) continue;
      const r = checkPairing(w.arabic, w.english);
      examined += r.componentCount;
      if (r.ok) {
        paired += r.componentCount;
      } else if (r.failure) {
        failures.push(r.failure);
      }
    }
    const rate = examined > 0 ? paired / examined : 1;
    fs.writeFileSync(
      '/tmp/ui-asymmetry-prod.json',
      JSON.stringify(
        {
          corpus: 'production',
          examined,
          paired,
          asymmetric: examined - paired,
          rate,
          failures: failures.slice(0, 50),
        },
        null,
        2,
      ),
    );
    expect(rate).toBeGreaterThanOrEqual(1.0);
  });

  test('single-word rule — single-word translations must never be colored', () => {
    // Per CLAUDE.md: single-word English translations get NO grammar color-coding,
    // with one principled exception: bracket-injected ال (e.g., "medicine" → "[the]
    // medicine") because the displayed tooltip renders as "the medicine" — two words,
    // composition visible. This matches the analyzer's own gate at
    // arabicWordAnalysis.ts:140 (single-word skip only when !hasBracketInjection).
    const failures: SingleWordFailure[] = [];
    const allCases = [
      ...ALL_DB_CASES.map(c => ({ arabic: c.arabic, english: c.english })),
      ...allWords.filter(w => w.arabic && w.english),
    ];
    for (const c of allCases) {
      const wordCount = c.english.trim().split(/\s+/).length;
      if (wordCount !== 1) continue;
      const norm = normalizeArabic(c.arabic);
      if (shouldInjectBracket(norm, c.english, c.arabic)) continue;
      const segs = computeColoredSegments(c.arabic, c.english, colors);
      const colored = segs.filter(s => isColoredSpan(s.color));
      if (colored.length > 0) {
        failures.push({
          arabic: c.arabic,
          english: c.english,
          coloredSpans: colored.map(s => ({ text: s.text, color: s.color, type: s.type })),
        });
      }
    }
    if (failures.length > 0) {
      fs.writeFileSync('/tmp/ui-single-word-violations.json', JSON.stringify(failures, null, 2));
    }
    expect(failures).toEqual([]);
  });

  test('reconstruction invariant — Arabic segments rejoin to the original word', () => {
    const allCases = [
      ...ALL_DB_CASES.map(c => ({ arabic: c.arabic, english: c.english })),
      ...allWords.filter(w => w.arabic && w.english),
    ];
    const broken: { arabic: string; english: string; reconstructed: string }[] = [];
    for (const c of allCases) {
      const segs = computeColoredSegments(c.arabic, c.english, colors);
      if (segs.length <= 1) continue;
      const joined = segs.map(s => s.text).join('');
      if (joined !== c.arabic) {
        broken.push({ arabic: c.arabic, english: c.english, reconstructed: joined });
      }
    }
    expect(broken).toEqual([]);
  });
});
