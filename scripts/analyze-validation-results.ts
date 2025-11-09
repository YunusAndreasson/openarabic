#!/usr/bin/env npx tsx
/**
 * Analyze validation results to understand patterns and prioritize fixes
 */

import * as fs from 'fs';
import * as path from 'path';

const resultFile =
  process.argv[2] || './scripts/output/arabic-coloring-validation-v2-2025-11-08T20-00-24.json';
const data = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));

console.log('='.repeat(80));
console.log('DATABASE STATISTICS');
console.log('='.repeat(80));
console.log(`Total unique words analyzed: ${data.meta.summary.totalAnalyzed}`);
console.log(
  `Clean words (no issues): ${data.meta.summary.cleanWords} (${((data.meta.summary.cleanWords / data.meta.summary.totalAnalyzed) * 100).toFixed(1)}%)`,
);
console.log(`Coloring bugs: ${data.meta.summary.coloringBugs}`);
console.log(`Translation errors: ${data.meta.summary.translationErrors}`);
console.log(`Ambiguous cases: ${data.meta.summary.ambiguousCases}`);
console.log();

console.log('='.repeat(80));
console.log('BUGS BY ENGLISH WORD COUNT');
console.log('='.repeat(80));

const singleWord: any[] = [];
const multiWord: any[] = [];

data.coloringBugs.forEach((bug: any) => {
  const wordCount = bug.english.trim().split(/\s+/).length;
  if (wordCount === 1) {
    singleWord.push(bug);
  } else {
    multiWord.push(bug);
  }
});

console.log(`Single-word English (expected behavior - no coloring): ${singleWord.length}`);
singleWord.forEach((bug: any) => {
  console.log(`  - ${bug.arabic} → "${bug.english}" (freq: ${bug.frequency})`);
});
console.log();

console.log(`Multi-word English (REAL BUGS to fix): ${multiWord.length}`);
multiWord.forEach((bug: any) => {
  const wordCount = bug.english.trim().split(/\s+/).length;
  console.log(`  - ${bug.arabic} → "${bug.english}" (${wordCount} words, freq: ${bug.frequency})`);
  console.log(`    Category: ${bug.category}`);
  console.log(`    Details: ${bug.details}`);
});
console.log();

console.log('='.repeat(80));
console.log('IMPACT ANALYSIS (by frequency)');
console.log('='.repeat(80));

const singleWordInstances = singleWord.reduce((sum, bug) => sum + bug.frequency, 0);
const multiWordInstances = multiWord.reduce((sum, bug) => sum + bug.frequency, 0);
const totalBugInstances = data.coloringBugs.reduce(
  (sum: number, bug: any) => sum + bug.frequency,
  0,
);

console.log(`Total affected word instances: ${totalBugInstances}`);
console.log(`  - Single-word (expected): ${singleWordInstances} instances`);
console.log(`  - Multi-word (bugs): ${multiWordInstances} instances`);
console.log();

const sorted = [...data.coloringBugs].sort((a: any, b: any) => b.frequency - a.frequency);
console.log('Top bugs by frequency:');
sorted.slice(0, 10).forEach((bug: any, i: number) => {
  const wordCount = bug.english.trim().split(/\s+/).length;
  const type = wordCount === 1 ? '[1-word, OK]' : `[${wordCount}-words, BUG]`;
  console.log(`  ${i + 1}. ${bug.arabic} → "${bug.english}" ${type} (freq: ${bug.frequency})`);
});
console.log();

console.log('='.repeat(80));
console.log('PATTERN ANALYSIS - Multi-word bugs by missing component');
console.log('='.repeat(80));

const missingSuffixes = multiWord.filter(b => b.category === 'missing_suffix_detection');
const missingPrefixes = multiWord.filter(b => b.category === 'missing_prefix_detection');

console.log(`Missing suffix detection: ${missingSuffixes.length} bugs`);
missingSuffixes.forEach((bug: any) => {
  const match = bug.details.match(/Should detect (\S+)/);
  const component = match ? match[1] : '?';
  console.log(`  - ${bug.arabic} → "${bug.english}" | Missing: ${component}`);
});
console.log();

console.log(`Missing prefix detection: ${missingPrefixes.length} bugs`);
missingPrefixes.forEach((bug: any) => {
  const match = bug.details.match(/Should detect (\S+)/);
  const component = match ? match[1] : '?';
  console.log(`  - ${bug.arabic} → "${bug.english}" | Missing: ${component}`);
});
