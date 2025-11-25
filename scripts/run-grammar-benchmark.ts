#!/usr/bin/env npx ts-node
/**
 * Grammar System Accuracy Benchmark Runner
 *
 * Generates a detailed accuracy report for the Arabic grammar component detection system.
 *
 * Run with: npx ts-node scripts/run-grammar-benchmark.ts
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  ALL_GROUND_TRUTH_CASES,
  getCorpusStats,
  NONE_CASES,
} = require('../__tests__/fixtures/grammarGroundTruth');
const {
  formatBenchmarkReport,
  runBenchmark,
  runDetailedBenchmark,
} = require('../utils/benchmarkUtils');

// Run the benchmark
console.log('Running Grammar System Accuracy Benchmark...\n');

// Corpus statistics
const stats = getCorpusStats();
console.log('=== Ground Truth Corpus ===');
console.log(`Total test cases: ${stats.total}`);
console.log(`By category: ${JSON.stringify(stats.byCategory, null, 2)}`);
console.log();

// Run detailed benchmark
const detailed = runDetailedBenchmark(ALL_GROUND_TRUTH_CASES);

// Print formatted report
console.log(formatBenchmarkReport(detailed));

// Additional analysis
console.log('\n=== NONE Category Analysis ===');
const noneResult = runBenchmark(NONE_CASES);
console.log(
  `True Negative Rate: ${((noneResult.trueNegatives / NONE_CASES.length) * 100).toFixed(1)}%`,
);
console.log(`False Positives: ${noneResult.falsePositives}`);

// Summary
console.log('\n=== Summary ===');
console.log(`Overall Precision: ${(detailed.overall.precision * 100).toFixed(1)}%`);
console.log(`Overall Recall: ${(detailed.overall.recall * 100).toFixed(1)}%`);
console.log(`Overall F1 Score: ${(detailed.overall.f1Score * 100).toFixed(1)}%`);
console.log(
  `hasComponents Accuracy: ${(detailed.overall.hasComponentsAccuracy * 100).toFixed(1)}%`,
);

// Targets
console.log('\n=== Improvement Targets ===');
console.log('Precision: 87.2% → 95%');
console.log('Recall: >80% → 90%');
console.log('NONE True Negative Rate: 68.4% → 90%');
