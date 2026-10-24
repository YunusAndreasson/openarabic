/**
 * Benchmark Utilities for Grammar System Accuracy Testing
 *
 * Provides tools for measuring precision, recall, and F1 score
 * of the Arabic grammar component detection system.
 */

import {
  analyzeArabicWord,
  normalizeArabic,
  shouldInjectBracket,
  type WordAnalysis,
} from './arabicWordAnalysis';

/**
 * Analyze a case exactly the way the UI does. computeColoredSegments prepends
 * "[the] " when bracket injection applies — a benchmark that skips this scores a
 * different pipeline than users see (it both misses injection-enabled paints and
 * is blind to injection-caused mis-paints).
 */
function analyzeLikeUi(arabic: string, english: string): WordAnalysis {
  const processedEnglish = shouldInjectBracket(normalizeArabic(arabic), english, arabic)
    ? `[the] ${english}`
    : english;
  return analyzeArabicWord(arabic, processedEnglish);
}

/** The components an analysis paints, by their Arabic spelling. */
interface DetectedComponents {
  prefixes: string[];
  suffix: string | null;
  infix: string | null;
  diacritic: string | null;
}

/**
 * What the UI would paint for this analysis — scored by both benchmarks.
 *
 * Gated on hasComponents: when the analyzer says false, the UI paints nothing,
 * so the benchmark must score nothing too — otherwise the metric drifts from
 * user-visible truth (and the failure list reports phantom FPs: standalone
 * particles like لَمْ whose detections never render). Components remain on the
 * WordAnalysis for non-render consumers (debugging, analytics) but are
 * invisible to scoring.
 */
function detectedComponents(analysis: WordAnalysis): DetectedComponents {
  if (!analysis.hasComponents) {
    return { prefixes: [], suffix: null, infix: null, diacritic: null };
  }
  return {
    prefixes: analysis.prefixes.map(p => p.arabicMatch),
    suffix: analysis.suffix?.arabicMatch ?? null,
    infix: analysis.infix?.arabicMatch ?? null,
    diacritic: analysis.diacritic?.arabicMatch ?? null,
  };
}

/**
 * Ground truth test case for benchmark validation
 */
export interface GroundTruthCase {
  /** Arabic word (with or without diacritics) */
  arabic: string;
  /** English translation */
  english: string;
  /** Expected prefixes that SHOULD be detected (manually verified) */
  expectedPrefixes: string[];
  /** Expected suffix that SHOULD be detected (null if none) */
  expectedSuffix: string | null;
  /** Expected infix that SHOULD be detected (null if none) */
  expectedInfix?: string | null;
  /**
   * Expected diacritic component that SHOULD be detected (null if none).
   *
   * Diacritics (تْ feminine-past, نَا "we", َا dual, انِ/ينِ dual case endings,
   * tanween) are a full component class the analyzer paints, so leaving them
   * unscored made a quarter of the model invisible to the gate: diacritic-only
   * improvements could never be credited, and diacritic false positives could
   * never be caught. The لَا "They cannot" mis-paint (a bare َا painted as the
   * dual-subject marker) had to be found by hand on-device precisely because
   * this field did not exist.
   *
   * Opt-in like `expectedInfix`: cases that leave it `undefined` are not scored,
   * so unlabeled cases never manufacture false positives.
   */
  expectedDiacritic?: string | null;
  /** Whether hasComponents should be true (shows composition) */
  expectedHasComponents: boolean;
  /** Category for reporting breakdown */
  category: 'prefix' | 'suffix' | 'infix' | 'combined' | 'none';
  /** Data source for tracking */
  source?: 'database' | 'test' | 'manual';
  /** Optional root_id for cross-reference */
  rootId?: number;
  /** Optional note explaining the case */
  note?: string;
}

/**
 * Results from running a benchmark
 */
export interface BenchmarkResult {
  /** Total number of test cases */
  totalCases: number;
  /** True positives - correctly detected components */
  truePositives: number;
  /** False positives - incorrectly detected components */
  falsePositives: number;
  /** False negatives - missed components that should be detected */
  falseNegatives: number;
  /** True negatives - correctly NOT detected (for 'none' category) */
  trueNegatives: number;
  /** Precision = TP / (TP + FP) */
  precision: number;
  /** Recall = TP / (TP + FN) */
  recall: number;
  /** F1 Score = 2 * (P * R) / (P + R) */
  f1Score: number;
  /** hasComponents accuracy */
  hasComponentsAccuracy: number;
}

/**
 * Detailed benchmark results with category breakdown
 */
export interface DetailedBenchmarkResult {
  overall: BenchmarkResult;
  byCategory: Record<GroundTruthCase['category'], BenchmarkResult>;
  byPattern: Map<string, PatternMetrics>;
  failures: FailureCase[];
}

/**
 * Metrics for a specific pattern (e.g., 'و', 'ه')
 */
export interface PatternMetrics {
  pattern: string;
  type: 'prefix' | 'suffix' | 'infix';
  detections: number;
  correct: number;
  incorrect: number;
  missed: number;
  precision: number;
}

/**
 * Details about a failed test case
 */
export interface FailureCase {
  testCase: GroundTruthCase;
  analysis: WordAnalysis;
  type: 'false_positive' | 'false_negative' | 'hasComponents_mismatch';
  details: string;
}

/**
 * Calculate precision from TP and FP counts
 */
function calculatePrecision(tp: number, fp: number): number {
  return tp + fp > 0 ? tp / (tp + fp) : 0;
}

/**
 * Calculate recall from TP and FN counts
 */
function calculateRecall(tp: number, fn: number): number {
  return tp + fn > 0 ? tp / (tp + fn) : 0;
}

/**
 * Calculate F1 score from precision and recall
 */
function calculateF1(precision: number, recall: number): number {
  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

/**
 * Compare detected prefixes against expected prefixes
 * Returns { tp, fp, fn } counts
 */
function comparePrefixes(
  detected: string[],
  expected: string[],
): { tp: number; fp: number; fn: number } {
  let tp = 0;
  let fp = 0;
  let fn = 0;

  // Count true positives and false negatives
  for (const exp of expected) {
    if (detected.includes(exp)) {
      tp++;
    } else {
      fn++;
    }
  }

  // Count false positives
  for (const det of detected) {
    if (!expected.includes(det)) {
      fp++;
    }
  }

  return { tp, fp, fn };
}

/**
 * Compare single component (suffix/infix) against expected
 */
function compareComponent(
  detected: string | null,
  expected: string | null,
): { tp: number; fp: number; fn: number } {
  if (expected && detected === expected) {
    return { tp: 1, fp: 0, fn: 0 };
  } else if (expected && detected !== expected) {
    // Expected but not detected (or detected wrong)
    return { tp: 0, fp: detected ? 1 : 0, fn: 1 };
  } else if (!expected && detected) {
    // Not expected but detected
    return { tp: 0, fp: 1, fn: 0 };
  }
  // Neither expected nor detected
  return { tp: 0, fp: 0, fn: 0 };
}

/**
 * Run benchmark on a set of ground truth cases
 */
export function runBenchmark(cases: GroundTruthCase[]): BenchmarkResult {
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;
  let totalTn = 0;
  let hasComponentsCorrect = 0;

  for (const testCase of cases) {
    const analysis = analyzeLikeUi(testCase.arabic, testCase.english);
    const {
      prefixes: detectedPrefixes,
      suffix: detectedSuffix,
      infix: detectedInfix,
      diacritic: detectedDiacritic,
    } = detectedComponents(analysis);

    // Compare prefixes
    const prefixResult = comparePrefixes(detectedPrefixes, testCase.expectedPrefixes);
    totalTp += prefixResult.tp;
    totalFp += prefixResult.fp;
    totalFn += prefixResult.fn;

    // Compare suffix
    const suffixResult = compareComponent(detectedSuffix, testCase.expectedSuffix);
    totalTp += suffixResult.tp;
    totalFp += suffixResult.fp;
    totalFn += suffixResult.fn;

    // Compare infix (if expected)
    if (testCase.expectedInfix !== undefined) {
      const infixResult = compareComponent(detectedInfix, testCase.expectedInfix);
      totalTp += infixResult.tp;
      totalFp += infixResult.fp;
      totalFn += infixResult.fn;
    }

    // Compare diacritic (opt-in — see GroundTruthCase.expectedDiacritic)
    if (testCase.expectedDiacritic !== undefined) {
      const diacriticResult = compareComponent(detectedDiacritic, testCase.expectedDiacritic);
      totalTp += diacriticResult.tp;
      totalFp += diacriticResult.fp;
      totalFn += diacriticResult.fn;
    }

    // Track true negatives for 'none' category. A detected diacritic disqualifies
    // the case just like a prefix/suffix/infix would — it paints.
    if (
      testCase.category === 'none' &&
      detectedPrefixes.length === 0 &&
      !detectedSuffix &&
      !detectedInfix &&
      !detectedDiacritic
    ) {
      totalTn++;
    }

    // Check hasComponents accuracy
    if (analysis.hasComponents === testCase.expectedHasComponents) {
      hasComponentsCorrect++;
    }
  }

  const precision = calculatePrecision(totalTp, totalFp);
  const recall = calculateRecall(totalTp, totalFn);
  const f1Score = calculateF1(precision, recall);

  return {
    totalCases: cases.length,
    truePositives: totalTp,
    falsePositives: totalFp,
    falseNegatives: totalFn,
    trueNegatives: totalTn,
    precision,
    recall,
    f1Score,
    hasComponentsAccuracy: cases.length > 0 ? hasComponentsCorrect / cases.length : 0,
  };
}

/**
 * Run detailed benchmark with category breakdown and pattern analysis
 */
export function runDetailedBenchmark(cases: GroundTruthCase[]): DetailedBenchmarkResult {
  const overall = runBenchmark(cases);

  // Group by category
  const casesByCategory = Object.groupBy(cases, c => c.category);
  const byCategory: Record<GroundTruthCase['category'], BenchmarkResult> = {
    prefix: runBenchmark(casesByCategory.prefix ?? []),
    suffix: runBenchmark(casesByCategory.suffix ?? []),
    infix: runBenchmark(casesByCategory.infix ?? []),
    combined: runBenchmark(casesByCategory.combined ?? []),
    none: runBenchmark(casesByCategory.none ?? []),
  };

  // Pattern-level analysis
  const patternMetrics = new Map<string, PatternMetrics>();

  // The running tally for one affix, created on first sight.
  const metricFor = (type: PatternMetrics['type'], pattern: string): PatternMetrics => {
    const key = `${type}:${pattern}`;
    let metric = patternMetrics.get(key);
    if (!metric) {
      metric = { pattern, type, detections: 0, correct: 0, incorrect: 0, missed: 0, precision: 0 };
      patternMetrics.set(key, metric);
    }
    return metric;
  };

  // Collect failures
  const failures: FailureCase[] = [];

  // An affix detected where the case expects none: counted against its pattern
  // and listed as a failure.
  const recordFalsePositive = (
    testCase: GroundTruthCase,
    analysis: WordAnalysis,
    type: 'prefix' | 'suffix',
    pattern: string,
  ): void => {
    const current = metricFor(type, pattern);
    current.detections++;
    current.incorrect++;
    current.precision = calculatePrecision(current.correct, current.incorrect);

    failures.push({
      testCase,
      analysis,
      type: 'false_positive',
      details: `Detected ${type} '${pattern}' but should not have`,
    });
  };

  for (const testCase of cases) {
    const analysis = analyzeLikeUi(testCase.arabic, testCase.english);
    const {
      prefixes: detectedPrefixes,
      suffix: detectedSuffix,
      diacritic: detectedDiacritic,
    } = detectedComponents(analysis);

    // Track prefix patterns
    for (const expected of testCase.expectedPrefixes) {
      const current = metricFor('prefix', expected);

      if (detectedPrefixes.includes(expected)) {
        current.detections++;
        current.correct++;
      } else {
        current.missed++;
      }
      current.precision = calculatePrecision(current.correct, current.incorrect);
    }

    // Track false positive prefixes
    for (const detected of detectedPrefixes) {
      if (!testCase.expectedPrefixes.includes(detected)) {
        recordFalsePositive(testCase, analysis, 'prefix', detected);
      }
    }

    // Track suffix patterns
    if (testCase.expectedSuffix) {
      const current = metricFor('suffix', testCase.expectedSuffix);

      if (detectedSuffix === testCase.expectedSuffix) {
        current.detections++;
        current.correct++;
      } else {
        current.missed++;
        failures.push({
          testCase,
          analysis,
          type: 'false_negative',
          details: `Expected suffix '${testCase.expectedSuffix}' but got '${detectedSuffix || 'none'}'`,
        });
      }
      current.precision = calculatePrecision(current.correct, current.incorrect);
    }

    // Track false positive suffix
    if (detectedSuffix && !testCase.expectedSuffix) {
      recordFalsePositive(testCase, analysis, 'suffix', detectedSuffix);
    }

    // Track diacritic hits and misses (only for labeled cases)
    if (testCase.expectedDiacritic !== undefined) {
      if (testCase.expectedDiacritic && detectedDiacritic !== testCase.expectedDiacritic) {
        failures.push({
          testCase,
          analysis,
          type: 'false_negative',
          details: `Expected diacritic '${testCase.expectedDiacritic}' but got '${detectedDiacritic || 'none'}'`,
        });
      } else if (!testCase.expectedDiacritic && detectedDiacritic) {
        failures.push({
          testCase,
          analysis,
          type: 'false_positive',
          details: `Detected diacritic '${detectedDiacritic}' but should not have`,
        });
      }
    }

    // Track hasComponents mismatch
    if (analysis.hasComponents !== testCase.expectedHasComponents) {
      failures.push({
        testCase,
        analysis,
        type: 'hasComponents_mismatch',
        details: `Expected hasComponents=${testCase.expectedHasComponents} but got ${analysis.hasComponents}`,
      });
    }
  }

  return {
    overall,
    byCategory,
    byPattern: patternMetrics,
    failures,
  };
}

/**
 * Format benchmark results as a human-readable report
 */
export function formatBenchmarkReport(result: DetailedBenchmarkResult): string {
  const lines: string[] = [];

  lines.push('Grammar System Accuracy Benchmark');
  lines.push('=================================');
  lines.push(`Total test cases: ${result.overall.totalCases}`);
  lines.push(`Run date: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  lines.push('OVERALL METRICS');
  lines.push('---------------');
  lines.push(`Precision: ${(result.overall.precision * 100).toFixed(1)}%`);
  lines.push(`Recall:    ${(result.overall.recall * 100).toFixed(1)}%`);
  lines.push(`F1 Score:  ${(result.overall.f1Score * 100).toFixed(1)}%`);
  lines.push(`hasComponents Accuracy: ${(result.overall.hasComponentsAccuracy * 100).toFixed(1)}%`);
  lines.push('');
  lines.push(`True Positives:  ${result.overall.truePositives}`);
  lines.push(`False Positives: ${result.overall.falsePositives}`);
  lines.push(`False Negatives: ${result.overall.falseNegatives}`);
  lines.push(`True Negatives:  ${result.overall.trueNegatives}`);
  lines.push('');

  lines.push('BY CATEGORY');
  lines.push('-----------');
  for (const [category, metrics] of Object.entries(result.byCategory)) {
    if (metrics.totalCases > 0) {
      lines.push(
        `${category.padEnd(10)}: P=${(metrics.precision * 100).toFixed(1)}% R=${(metrics.recall * 100).toFixed(1)}% F1=${(metrics.f1Score * 100).toFixed(1)}% (n=${metrics.totalCases})`,
      );
    }
  }
  lines.push('');

  // Pattern breakdown (sorted by incorrect count)
  const patterns = Array.from(result.byPattern.values()).sort(
    (a, b) => b.incorrect + b.missed - (a.incorrect + a.missed),
  );

  if (patterns.length > 0) {
    lines.push('PATTERN ANALYSIS (sorted by error count)');
    lines.push('----------------------------------------');
    for (const p of patterns.slice(0, 15)) {
      const errors = p.incorrect + p.missed;
      if (errors > 0 || p.detections > 0) {
        lines.push(
          `${p.type}:${p.pattern.padEnd(4)} - Correct: ${p.correct}, FP: ${p.incorrect}, Missed: ${p.missed}`,
        );
      }
    }
    lines.push('');
  }

  // Top failures
  if (result.failures.length > 0) {
    lines.push(`FAILURES (${result.failures.length} total, showing first 10)`);
    lines.push('--------------------------------------------------');
    for (const f of result.failures.slice(0, 10)) {
      lines.push(`[${f.type}] ${f.testCase.arabic} → "${f.testCase.english}"`);
      lines.push(`         ${f.details}`);
    }
  }

  return lines.join('\n');
}
