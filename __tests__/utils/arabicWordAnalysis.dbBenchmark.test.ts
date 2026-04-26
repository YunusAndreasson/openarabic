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

import { ALL_DB_CASES, DB_TEST_CASES, DB_TRAIN_CASES } from '@/__tests__/fixtures/grammarGroundTruth.db';
import { runBenchmark } from '@/utils/benchmarkUtils';

// Thresholds set ~0.5pp below current measured values (98.04 / 88.24 / 92.88 / 97.64 train,
// 99.18 / 85.82 / 92.02 / 94.22 test) so natural variance does not flake CI.
const THRESHOLDS = {
  train: {
    precision: 0.975,
    recall: 0.875,
    f1Score: 0.925,
    hasComponentsAccuracy: 0.97,
  },
  test: {
    precision: 0.985,
    recall: 0.85,
    f1Score: 0.915,
    hasComponentsAccuracy: 0.94,
  },
  byBucket: {
    multiWordHasComponents: { hasComponentsAccuracy: 0.985, precision: 0.995 },
    singleWord: { hasComponentsAccuracy: 1.0 },
    longPhrase: { hasComponentsAccuracy: 0.97 },
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
    const cases = ALL_DB_CASES.filter((c) => c.bucket === 'multiWordHasComponents');
    const r = runBenchmark(cases);
    console.log(`\n  multiWordHasComponents (n=${cases.length}): P=${(r.precision * 100).toFixed(2)}% hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`);
    expect(r.precision).toBeGreaterThanOrEqual(THRESHOLDS.byBucket.multiWordHasComponents.precision);
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.multiWordHasComponents.hasComponentsAccuracy,
    );
  });

  test('singleWord bucket — single-word rule must remain bulletproof', () => {
    const cases = ALL_DB_CASES.filter((c) => c.bucket === 'singleWord');
    const r = runBenchmark(cases);
    console.log(`\n  singleWord (n=${cases.length}): hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`);
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.singleWord.hasComponentsAccuracy,
    );
  });

  test('longPhrase bucket — compound-prefix territory', () => {
    const cases = ALL_DB_CASES.filter((c) => c.bucket === 'longPhrase');
    const r = runBenchmark(cases);
    console.log(`\n  longPhrase (n=${cases.length}): hasC=${(r.hasComponentsAccuracy * 100).toFixed(2)}%`);
    expect(r.hasComponentsAccuracy).toBeGreaterThanOrEqual(
      THRESHOLDS.byBucket.longPhrase.hasComponentsAccuracy,
    );
  });
});
