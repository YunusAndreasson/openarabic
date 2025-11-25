/**
 * Arabic Word Analysis - Accuracy Benchmark Test Suite
 *
 * This test suite measures the accuracy of the grammar component detection system
 * using manually-verified ground truth test cases.
 *
 * Metrics reported:
 * - Precision: TP / (TP + FP) - How many detected components are correct
 * - Recall: TP / (TP + FN) - How many expected components are detected
 * - F1 Score: Harmonic mean of precision and recall
 *
 * Run with: yarn test arabicWordAnalysis.benchmark
 */

import { describe, expect, test } from '@jest/globals';

import {
  ALL_GROUND_TRUTH_CASES,
  COMBINED_CASES,
  getCorpusStats,
  INFIX_CASES,
  NONE_CASES,
  PREFIX_CASES,
  SUFFIX_CASES,
} from '@/__tests__/fixtures/grammarGroundTruth';
import { formatBenchmarkReport, runBenchmark, runDetailedBenchmark } from '@/utils/benchmarkUtils';

// Current baseline thresholds (adjusted based on initial benchmark)
// These represent minimum acceptable levels - improvement targets are in comments
const THRESHOLDS = {
  precision: 0.85, // Current: 87.2%, Target: 95%
  recall: 0.8, // Current: >80%, Target: 90%
  f1Score: 0.8, // Current: >85%, Target: 90%
  hasComponentsAccuracy: 0.85, // Current: >90%, Target: 95%
};

describe('Grammar System Accuracy Benchmark', () => {
  describe('Corpus Statistics', () => {
    test('should have sufficient test cases', () => {
      const stats = getCorpusStats();

      // Log corpus statistics
      console.log('\n=== Ground Truth Corpus Statistics ===');
      console.log(`Total cases: ${stats.total}`);
      console.log('By category:', stats.byCategory);
      console.log('By source:', stats.bySource);

      // Minimum corpus requirements
      expect(stats.total).toBeGreaterThanOrEqual(50);
      expect(stats.byCategory['prefix'] || 0).toBeGreaterThanOrEqual(10);
      expect(stats.byCategory['suffix'] || 0).toBeGreaterThanOrEqual(10);
      expect(stats.byCategory['none'] || 0).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Overall Accuracy', () => {
    test('should meet precision threshold', () => {
      const result = runBenchmark(ALL_GROUND_TRUTH_CASES);
      console.log(`\nPrecision: ${(result.precision * 100).toFixed(1)}%`);
      expect(result.precision).toBeGreaterThanOrEqual(THRESHOLDS.precision);
    });

    test('should meet recall threshold', () => {
      const result = runBenchmark(ALL_GROUND_TRUTH_CASES);
      console.log(`Recall: ${(result.recall * 100).toFixed(1)}%`);
      expect(result.recall).toBeGreaterThanOrEqual(THRESHOLDS.recall);
    });

    test('should meet F1 score threshold', () => {
      const result = runBenchmark(ALL_GROUND_TRUTH_CASES);
      console.log(`F1 Score: ${(result.f1Score * 100).toFixed(1)}%`);
      expect(result.f1Score).toBeGreaterThanOrEqual(THRESHOLDS.f1Score);
    });

    test('should meet hasComponents accuracy threshold', () => {
      const result = runBenchmark(ALL_GROUND_TRUTH_CASES);
      console.log(`hasComponents Accuracy: ${(result.hasComponentsAccuracy * 100).toFixed(1)}%`);
      expect(result.hasComponentsAccuracy).toBeGreaterThanOrEqual(THRESHOLDS.hasComponentsAccuracy);
    });
  });

  describe('Category-Specific Accuracy', () => {
    test('PREFIX category should meet thresholds', () => {
      const result = runBenchmark(PREFIX_CASES);
      console.log(
        `\nPREFIX: P=${(result.precision * 100).toFixed(1)}% R=${(result.recall * 100).toFixed(1)}% F1=${(result.f1Score * 100).toFixed(1)}%`,
      );
      expect(result.precision).toBeGreaterThanOrEqual(0.85);
      expect(result.recall).toBeGreaterThanOrEqual(0.75);
    });

    test('SUFFIX category should meet thresholds', () => {
      const result = runBenchmark(SUFFIX_CASES);
      console.log(
        `SUFFIX: P=${(result.precision * 100).toFixed(1)}% R=${(result.recall * 100).toFixed(1)}% F1=${(result.f1Score * 100).toFixed(1)}%`,
      );
      expect(result.precision).toBeGreaterThanOrEqual(0.85);
      expect(result.recall).toBeGreaterThanOrEqual(0.75);
    });

    test('COMBINED category should meet thresholds', () => {
      const result = runBenchmark(COMBINED_CASES);
      console.log(
        `COMBINED: P=${(result.precision * 100).toFixed(1)}% R=${(result.recall * 100).toFixed(1)}% F1=${(result.f1Score * 100).toFixed(1)}%`,
      );
      expect(result.precision).toBeGreaterThanOrEqual(0.8);
      expect(result.recall).toBeGreaterThanOrEqual(0.7);
    });

    test('INFIX category should meet thresholds', () => {
      if (INFIX_CASES.length === 0) {
        console.log('INFIX: No test cases defined');
        return;
      }
      const result = runBenchmark(INFIX_CASES);
      console.log(
        `INFIX: P=${(result.precision * 100).toFixed(1)}% R=${(result.recall * 100).toFixed(1)}% F1=${(result.f1Score * 100).toFixed(1)}%`,
      );
      expect(result.precision).toBeGreaterThanOrEqual(0.7);
      expect(result.recall).toBeGreaterThanOrEqual(0.6);
    });

    test('NONE category should have high true negative rate', () => {
      const result = runBenchmark(NONE_CASES);
      console.log(
        `NONE: TrueNegatives=${result.trueNegatives}/${NONE_CASES.length} (${((result.trueNegatives / NONE_CASES.length) * 100).toFixed(1)}%)`,
      );
      console.log(`      FalsePositives=${result.falsePositives}`);

      // For NONE category, we want high true negative rate (correctly NOT detecting)
      // Current: 68.4%, Target: 90%
      const trueNegativeRate = NONE_CASES.length > 0 ? result.trueNegatives / NONE_CASES.length : 0;
      expect(trueNegativeRate).toBeGreaterThanOrEqual(0.65);
    });
  });

  describe('Detailed Analysis', () => {
    test('should generate comprehensive benchmark report', () => {
      const detailedResult = runDetailedBenchmark(ALL_GROUND_TRUTH_CASES);
      const report = formatBenchmarkReport(detailedResult);

      console.log('\n' + report);

      // Report should contain key sections
      expect(report).toContain('OVERALL METRICS');
      expect(report).toContain('BY CATEGORY');
      expect(report).toContain('Precision');
      expect(report).toContain('Recall');
      expect(report).toContain('F1 Score');
    });

    test('should identify failure patterns', () => {
      const detailedResult = runDetailedBenchmark(ALL_GROUND_TRUTH_CASES);

      if (detailedResult.failures.length > 0) {
        console.log(`\n=== Failure Analysis (${detailedResult.failures.length} failures) ===`);

        // Group failures by type
        const byType: Record<string, number> = {};
        for (const f of detailedResult.failures) {
          byType[f.type] = (byType[f.type] || 0) + 1;
        }
        console.log('By type:', byType);

        // Show top 5 failures
        console.log('\nTop 5 failures:');
        for (const f of detailedResult.failures.slice(0, 5)) {
          console.log(`  [${f.type}] ${f.testCase.arabic} → "${f.testCase.english}"`);
          console.log(`           ${f.details}`);
        }
      } else {
        console.log('\n=== No failures detected ===');
      }

      // Failures should be less than 20% of total
      const failureRate = detailedResult.failures.length / ALL_GROUND_TRUTH_CASES.length;
      expect(failureRate).toBeLessThan(0.2);
    });

    test('should track pattern-level metrics', () => {
      const detailedResult = runDetailedBenchmark(ALL_GROUND_TRUTH_CASES);

      console.log('\n=== Pattern-Level Metrics ===');

      // Sort patterns by error count
      const patterns = Array.from(detailedResult.byPattern.values()).sort(
        (a, b) => b.incorrect + b.missed - (a.incorrect + a.missed),
      );

      // Show top 10 patterns
      for (const p of patterns.slice(0, 10)) {
        if (p.detections > 0 || p.missed > 0) {
          const precision = p.correct + p.incorrect > 0 ? p.correct / (p.correct + p.incorrect) : 1;
          console.log(
            `  ${p.type}:${p.pattern.padEnd(4)} - Correct: ${p.correct}, FP: ${p.incorrect}, Missed: ${p.missed}, P=${(precision * 100).toFixed(0)}%`,
          );
        }
      }

      // Ensure we have pattern tracking
      expect(detailedResult.byPattern.size).toBeGreaterThan(0);
    });
  });

  describe('Critical Requirements', () => {
    test('should have zero single-word rule violations', () => {
      // Single-word translations should NEVER have hasComponents=true
      const singleWordCases = ALL_GROUND_TRUTH_CASES.filter(c => {
        const wordCount = c.english.trim().split(/\s+/).length;
        return wordCount === 1;
      });

      let violations = 0;
      for (const c of singleWordCases) {
        // All single-word cases should expect hasComponents=false
        if (c.expectedHasComponents === true) {
          console.log(
            `Warning: Test case expects coloring for single word: ${c.arabic} → "${c.english}"`,
          );
          violations++;
        }
      }

      expect(violations).toBe(0);
    });

    test('should correctly handle root letter confusion', () => {
      // Test cases where letters could be mistaken for affixes but are actually root letters
      const rootConfusionCases = ALL_GROUND_TRUTH_CASES.filter(
        c => c.note && c.note.includes('root letter'),
      );

      const result = runBenchmark(rootConfusionCases);

      console.log(`\nRoot letter confusion cases: ${rootConfusionCases.length}`);
      console.log(`  False positives: ${result.falsePositives} (should be 0)`);

      // Should have zero false positives for root letter cases
      expect(result.falsePositives).toBe(0);
    });
  });
});
