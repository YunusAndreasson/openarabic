#!/usr/bin/env npx tsx
/**
 * Debug suffix detection issues
 */

import { analyzeArabicWord } from '../utils/arabicWordAnalysis';

const testCases = [
  { arabic: 'يَوْمَكَ', english: 'your day', expected: 'ك' },
  { arabic: 'يَوْمِي', english: 'my day', expected: 'ي' },
  { arabic: 'نَواها', english: 'its seeds', expected: 'ها' },
  { arabic: 'نَواهُ', english: 'its seeds', expected: 'ه' },
  { arabic: 'عَلَيْكَ', english: 'to you', expected: 'ك' },
  { arabic: 'فِيهِ', english: 'about it', expected: 'ه' },
];

console.log('Debugging Suffix Detection\n' + '='.repeat(80));

testCases.forEach(({ arabic, english, expected }) => {
  const result = analyzeArabicWord(arabic, english);

  const detected = result.suffix?.arabicMatch || 'NONE';
  const status = detected === expected ? '✓' : '✗';

  console.log(`\n${status} ${arabic} → "${english}"`);
  console.log(`   Expected suffix: ${expected}`);
  console.log(`   Detected suffix: ${detected}`);
  console.log(`   hasComponents: ${result.hasComponents}`);
  console.log(`   Prefixes: ${result.prefixes.map(p => p.arabicMatch).join(', ') || 'none'}`);
  console.log(`   Suffix English: ${result.suffix?.englishMatches.join(', ') || 'none'}`);
});
