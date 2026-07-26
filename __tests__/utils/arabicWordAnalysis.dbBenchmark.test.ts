/**
 * Production benchmark for the Arabic word-component classifier against
 * the LLM-labeled real-database corpus (597 cases, hash-split into 424 train + 173 test).
 *
 * This complements arabicWordAnalysis.benchmark.test.ts (which uses the small
 * hand-verified 67-case set). The DB benchmark is the real regression gate:
 * it samples the actual production data distribution, including bucket-stratified
 * coverage of single-word translations, multi-prefix sequences, long phrases,
 * and long-tail Arabic forms.
 *
 * Thresholds are set ~0.5–1pp below the current measured values so natural
 * variance does not flake CI, but any meaningful regression breaks the build.
 *
 * To re-baseline after an intentional behavior change, update the THRESHOLDS
 * block below and document the reason in the same commit.
 */
import { describe, expect, test } from '@jest/globals';

import {
  ALL_DB_CASES,
  DB_TEST_CASES,
  DB_TRAIN_CASES,
} from '@/__tests__/fixtures/grammarGroundTruth.db';
import { runBenchmark } from '@/utils/benchmarkUtils';

// Thresholds reflect the honest, UI-symmetric analyzer. The benchmark gates on
// `analysis.hasComponents` (utils/benchmarkUtils.ts), so it scores exactly what the
// UI paints. Current measured: train 95.90 / 82.65 / 88.78 / 95.05; test 97.44 / 80.85 /
// 88.37 / 92.49. Set ~1-2pp below so natural variance does not flake CI. The first-class
// gate is arabicGrammar.uiInvariant.test.ts (every kept component renders on BOTH sides).
// This dbBenchmark is a secondary signal — useful for tracking analyzer-side changes
// during tuning, but never the deciding metric.
//
// 2026-06-19 re-baseline: removed false-positive case-ending diacritic detection (bare
// final fatha "he <verb>"; bare nunation "a/an" on indefinite nouns) — the corpus has
// zero diacritic-only components, so these only painted non-morphemes. hasComponents
// accuracy rose (train 91.04→95.05, test 88.44→92.49, multiWord bucket 90.91→98.48);
// precision/recall/F1 unchanged (diacritics aren't scored in P/R/F1). Thresholds
// ratcheted up to lock the gains.
// 2026-07-17 re-baseline: the benchmark now analyzes through the same [the]
// bracket-injection preprocessing the UI applies (analyzeLikeUi in benchmarkUtils),
// so these numbers describe what users actually see. Combined with the fused-ال,
// shortened-preposition, root-letter و/ف, fatha-alef, and object-claim fixes plus
// the displayed-text relabel of the injection cluster: train P .959→.984,
// F1 .888→.917; test P .974→1.00, F1 .884→.920. Thresholds ratcheted to lock it.
//
// 2026-07-26 re-baseline: P/R/F1 now cover the DIACRITIC class. It had never been
// scored — runBenchmark compared prefixes, suffix and infix only — so diacritic
// gains were uncreditable and diacritic false positives were unscoreable. All 597
// cases carry `expectedDiacritic`, and three fixes landed with it: the four dead
// tanween entries were removed (their leftover 'one'/'a' triggers painted 235
// production words), تْ gained its 'she'/'they' triggers, and normalizeEnglish
// stopped welding alternative glosses ("she/it" → "sheit"). Measured: train P
// .984→.985, R .858→.871, F1 .917→.925; test R .851→.874, F1 .920→.933 (test
// precision stays 1.000). The held-out split gained more than train.
//
// Same session, elided-connective consume: وَالسَّمَاءِ "the sky" painted nothing at all,
// because an unmatched و ended prefix detection and took the ال behind it down with it.
// The conjunction is now consumed without becoming a component (`elidedPrefixLength`)
// so the article can pair. Restricted to a following ال — allowing any prefix cost
// precision (وَأَمَّا "as for" read أما as a prefix meaning "as"). Train R .871→.874,
// F1 .925→.926, hasC .974→.976 at unchanged precision; 22 more production words paint.
const THRESHOLDS = {
  train: {
    precision: 0.98,
    recall: 0.869,
    f1Score: 0.921,
    hasComponentsAccuracy: 0.971,
  },
  test: {
    precision: 0.99,
    recall: 0.869,
    f1Score: 0.928,
    hasComponentsAccuracy: 0.948,
  },
  byBucket: {
    multiWordHasComponents: { hasComponentsAccuracy: 0.985, precision: 0.99 },
    singleWord: { hasComponentsAccuracy: 1.0 },
    longPhrase: { hasComponentsAccuracy: 0.982 },
  },
};

describe('Arabic classifier — DB-corpus benchmark (production gate)', () => {
  test('train split (424) meets thresholds', () => {
    const r = runBenchmark(DB_TRAIN_CASES);
    console.log(
      `\n  TRAIN: P=${(r.precision * 100).toFixed(2)}% R=${(r.recall * 100).toFixed(2)}% F1=${(r.f1Score * 100).toFixed(2)}% hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`,
    );
    expect(r.precision).toBeGreaterThanOrEqual(THRESHOLDS.train.precision);
    expect(r.recall).toBeGreaterThanOrEqual(THRESHOLDS.train.recall);
    expect(r.f1Score).toBeGreaterThanOrEqual(THRESHOLDS.train.f1Score);
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(THRESHOLDS.train.hasComponentsAccuracy);
  });

  test('test split (173) — held-out overfitting guard — meets thresholds', () => {
    const r = runBenchmark(DB_TEST_CASES);
    console.log(
      `\n  TEST : P=${(r.precision * 100).toFixed(2)}% R=${(r.recall * 100).toFixed(2)}% F1=${(r.f1Score * 100).toFixed(2)}% hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`,
    );
    expect(r.precision).toBeGreaterThanOrEqual(THRESHOLDS.test.precision);
    expect(r.recall).toBeGreaterThanOrEqual(THRESHOLDS.test.recall);
    expect(r.f1Score).toBeGreaterThanOrEqual(THRESHOLDS.test.f1Score);
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(THRESHOLDS.test.hasComponentsAccuracy);
  });

  test('multiWordHasComponents bucket — analyzer s primary turf — high precision + hasC', () => {
    const cases = ALL_DB_CASES.filter(c => c.bucket === 'multiWordHasComponents');
    const r = runBenchmark(cases);
    console.log(
      `\n  multiWordHasComponents (n=${cases.length}): P=${(r.precision * 100).toFixed(2)}% hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`,
    );
    expect(r.precision).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.multiWordHasComponents.precision,
    );
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.multiWordHasComponents.hasComponentsAccuracy,
    );
  });

  test('singleWord bucket — single-word rule must remain bulletproof', () => {
    const cases = ALL_DB_CASES.filter(c => c.bucket === 'singleWord');
    const r = runBenchmark(cases);
    console.log(
      `\n  singleWord (n=${cases.length}): hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`,
    );
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.singleWord.hasComponentsAccuracy,
    );
  });

  test('longPhrase bucket — compound-prefix territory', () => {
    const cases = ALL_DB_CASES.filter(c => c.bucket === 'longPhrase');
    const r = runBenchmark(cases);
    console.log(
      `\n  longPhrase (n=${cases.length}): hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`,
    );
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.longPhrase.hasComponentsAccuracy,
    );
  });
});
