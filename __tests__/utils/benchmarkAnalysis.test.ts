/**
 * Benchmark Analysis - Detailed failure analysis for improvement insights
 */

import { describe, expect, test } from '@jest/globals';

import {
  ALL_GROUND_TRUTH_CASES,
  getCorpusStats,
  NONE_CASES,
} from '@/__tests__/fixtures/grammarGroundTruth';
import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { runDetailedBenchmark } from '@/utils/benchmarkUtils';

describe('Benchmark Analysis for Code Improvement', () => {
  test('DETAILED ANALYSIS OUTPUT', () => {
    const stats = getCorpusStats();
    const detailed = runDetailedBenchmark(ALL_GROUND_TRUTH_CASES);

    // Build output string
    const lines: string[] = [];

    lines.push('\n========================================');
    lines.push('GRAMMAR SYSTEM ACCURACY BENCHMARK REPORT');
    lines.push('========================================\n');

    lines.push(`Total test cases: ${stats.total}`);
    lines.push(`By category: prefix=${stats.byCategory.prefix || 0}, suffix=${stats.byCategory.suffix || 0}, infix=${stats.byCategory.infix || 0}, combined=${stats.byCategory.combined || 0}, none=${stats.byCategory.none || 0}`);

    lines.push('\n--- OVERALL METRICS ---');
    lines.push(`Precision: ${(detailed.overall.precision * 100).toFixed(1)}%`);
    lines.push(`Recall: ${(detailed.overall.recall * 100).toFixed(1)}%`);
    lines.push(`F1 Score: ${(detailed.overall.f1Score * 100).toFixed(1)}%`);
    lines.push(`hasComponents Accuracy: ${(detailed.overall.hasComponentsAccuracy * 100).toFixed(1)}%`);
    lines.push(`True Positives: ${detailed.overall.truePositives}`);
    lines.push(`False Positives: ${detailed.overall.falsePositives}`);
    lines.push(`False Negatives: ${detailed.overall.falseNegatives}`);

    lines.push('\n--- BY CATEGORY ---');
    for (const [cat, m] of Object.entries(detailed.byCategory)) {
      if (m.totalCases > 0) {
        lines.push(`${cat.toUpperCase()}: P=${(m.precision * 100).toFixed(0)}% R=${(m.recall * 100).toFixed(0)}% F1=${(m.f1Score * 100).toFixed(0)}% (n=${m.totalCases})`);
      }
    }

    lines.push('\n--- FAILURES BY TYPE ---');
    const byType: Record<string, number> = {};
    for (const f of detailed.failures) {
      byType[f.type] = (byType[f.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(byType)) {
      lines.push(`${type}: ${count}`);
    }

    lines.push('\n--- ALL FAILURES (for code improvement) ---');
    for (const f of detailed.failures) {
      lines.push(`\n[${f.type}] "${f.testCase.arabic}" → "${f.testCase.english}"`);
      lines.push(`  Expected: prefixes=[${f.testCase.expectedPrefixes.join(',')}] suffix=${f.testCase.expectedSuffix || 'none'} hasComponents=${f.testCase.expectedHasComponents}`);
      lines.push(`  Got:      prefixes=[${f.analysis.prefixes.map(p => p.arabicMatch).join(',')}] suffix=${f.analysis.suffix?.arabicMatch || 'none'} hasComponents=${f.analysis.hasComponents}`);
      lines.push(`  Details:  ${f.details}`);
      if (f.testCase.note) {
        lines.push(`  Note:     ${f.testCase.note}`);
      }
    }

    lines.push('\n--- NONE CATEGORY DETAILED ANALYSIS ---');
    lines.push('(These should NOT have components detected)\n');
    for (const c of NONE_CASES) {
      const result = analyzeArabicWord(c.arabic, c.english);
      const detected = result.prefixes.length > 0 || result.suffix || result.infix;
      const status = detected ? '❌ FALSE POSITIVE' : '✓ CORRECT';
      lines.push(`${status}: "${c.arabic}" → "${c.english}"`);
      if (detected) {
        lines.push(`  Detected: prefixes=[${result.prefixes.map(p => p.arabicMatch).join(',')}] suffix=${result.suffix?.arabicMatch || 'none'}`);
        lines.push(`  Note: ${c.note || 'n/a'}`);
      }
    }

    lines.push('\n--- PATTERN ANALYSIS (errors only) ---');
    const patterns = Array.from(detailed.byPattern.values())
      .filter(p => p.incorrect > 0 || p.missed > 0)
      .sort((a, b) => (b.incorrect + b.missed) - (a.incorrect + a.missed));
    for (const p of patterns) {
      lines.push(`${p.type}:${p.pattern} - Correct=${p.correct} FP=${p.incorrect} Missed=${p.missed}`);
    }

    lines.push('\n========================================');
    lines.push('END OF REPORT');
    lines.push('========================================\n');

    // Write to stderr which Jest doesn't suppress
    process.stderr.write(lines.join('\n'));

    expect(lines.length).toBeGreaterThan(0);
  });
});
