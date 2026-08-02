#!/usr/bin/env npx tsx

import { analyzeArabicWord } from '../utils/arabicWordAnalysis';

console.log('🔍 Arabic Expert Analysis - Testing Specific Cases\n');

const testCases = [
  // Suspected BUG: ب not detected as prefix
  { arabic: 'بِهِ', english: 'with him', expected: 'Prefix: ب (with) + Suffix: ه (him)' },
  { arabic: 'بِهَا', english: 'with it', expected: 'Prefix: ب (with) + Suffix: ها (it)' },
  { arabic: 'بِكَ', english: 'with you', expected: 'Prefix: ب (with) + Suffix: ك (you)' },

  // Valid compound particles (should analyze correctly)
  { arabic: 'لَهُ', english: 'for him', expected: 'Prefix: ل (for) + Suffix: ه (him)' },
  { arabic: 'فَإِنْ', english: 'so if', expected: 'Prefix: ف (so) + Prefix: إِنْ (if)' },
  { arabic: 'وَإِنْ', english: 'and if', expected: 'Prefix: و (and) + Prefix: إِنْ (if)' },

  // Words with possessive suffixes (should be correct)
  { arabic: 'رَبِّهِ', english: 'his Lord', expected: 'Root: رب + Suffix: ه (his)' },
  { arabic: 'عِلْمِهِ', english: 'his knowledge', expected: 'Root: علم + Suffix: ه (his)' },

  // Testing ك prefix
  { arabic: 'كَمَا', english: 'just as', expected: 'Prefix: ك (as) + particle: ما' },
];

for (const test of testCases) {
  console.log('━'.repeat(80));
  console.log(`Arabic: ${test.arabic} → English: "${test.english}"`);
  console.log(`Expected: ${test.expected}\n`);

  const analysis = analyzeArabicWord(test.arabic, test.english);

  console.log('Actual Analysis:');
  console.log(`  Components: ${analysis.hasComponents ? 'YES' : 'NO'}`);
  console.log(
    `  Prefixes: ${analysis.prefixes.length > 0 ? analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(' + ') : 'none'}`,
  );
  console.log(
    `  Suffix: ${analysis.suffix ? `${analysis.suffix.arabicMatch} (${analysis.suffix.englishMatches.join('/')})` : 'none'}`,
  );
  console.log(`  Infix: ${analysis.infix ? `${analysis.infix.arabicMatch}` : 'none'}`);
  console.log(`  Remaining: "${analysis.remainingArabic}" → "${analysis.remainingEnglish}"`);

  // Bug detection
  const bugs: string[] = [];

  // Check for ب prefix bug
  if (test.arabic.startsWith('ب') && analysis.prefixes.length === 0) {
    bugs.push('🐛 BUG: ب prefix NOT detected but word starts with ب');
  }

  // Check if ب is incorrectly left in remaining text
  if (
    analysis.remainingArabic.includes('ب') &&
    analysis.remainingEnglish.toLowerCase().includes('with')
  ) {
    bugs.push('🐛 BUG: ب left in remaining text instead of being detected as prefix');
  }

  // Check for missing prefix when word starts with common prefixes
  const commonPrefixes = ['و', 'ف', 'ب', 'ل', 'ك'];
  for (const prefix of commonPrefixes) {
    if (test.arabic.startsWith(prefix) && !analysis.prefixes.some(p => p.arabicMatch === prefix)) {
      bugs.push(`🐛 POTENTIAL BUG: Word starts with ${prefix} but not detected as prefix`);
    }
  }

  // Check for suffix-only detection when there should be a prefix
  if (analysis.suffix && analysis.prefixes.length === 0 && test.expected.includes('Prefix:')) {
    bugs.push('⚠️  WARNING: Suffix detected but expected prefix is missing');
  }

  if (bugs.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    bugs.forEach(bug => console.log(`  ${bug}`));
  } else {
    console.log('\n✅ Analysis looks correct');
  }

  console.log('');
}

console.log('\n' + '━'.repeat(80));
console.log('SUMMARY OF FINDINGS');
console.log('━'.repeat(80));
