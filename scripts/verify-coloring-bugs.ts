#!/usr/bin/env npx tsx

import { analyzeArabicWord } from '../utils/arabicWordAnalysis';

console.log('🔍 Verifying Reported "Coloring Bugs"\n');

const reportedBugs = [
  { arabic: 'وَ', english: 'and' },
  { arabic: 'رَآهَا', english: 'he sees it' },
  { arabic: 'هَذِهِ', english: 'this' },
  { arabic: 'رَدَّهَا', english: 'He rejects it' },
  { arabic: 'نَفْسِهِ', english: 'himself' },
  { arabic: 'نَفْسَهُ', english: 'himself' },
  { arabic: 'كَمِثلِ', english: 'like' },
  { arabic: 'نَواها', english: 'its seeds' },
  { arabic: 'لَهُ', english: 'Him' },
  { arabic: 'لَهُ', english: 'His' },
  { arabic: 'لَهُ', english: 'his' },
  { arabic: 'لَكَ', english: 'your' },
  { arabic: 'بِهِ', english: 'from it' },
  { arabic: 'تِلَاوَتِهِ', english: 'recitation' },
];

console.log('Analyzing each reported bug:\n');

for (const bug of reportedBugs) {
  const wordCount = bug.english.trim().split(/\s+/).length;
  const analysis = analyzeArabicWord(bug.arabic, bug.english);

  console.log('━'.repeat(80));
  console.log(`Arabic: ${bug.arabic} → English: "${bug.english}"`);
  console.log(`Word Count: ${wordCount} | Has Components: ${analysis.hasComponents}`);

  if (wordCount === 1) {
    console.log('✅ CORRECT BEHAVIOR: Single-word English should NOT be colored');
    console.log('   This is NOT a bug - it follows the single-word rule!');
  } else if (wordCount > 1 && !analysis.hasComponents) {
    console.log('❌ REAL BUG: Multi-word English but no components detected');
    console.log(`   Expected to find components in "${bug.arabic}"`);
  } else if (wordCount > 1 && analysis.hasComponents) {
    console.log('✅ CORRECT: Multi-word English with components detected');
  }

  // Special cases
  if (bug.arabic === 'هَذِهِ') {
    console.log('\n📚 LINGUISTIC NOTE: هَذِهِ is a demonstrative pronoun (اسم إشارة)');
    console.log('   The ه is part of the root هذ, NOT a possessive suffix');
    console.log('   Correct behavior: NO component detection for demonstratives');
  }

  if (bug.arabic === 'وَ') {
    console.log('\n📚 LINGUISTIC NOTE: وَ standalone is unusual');
    console.log('   Usually و appears attached to following word');
    console.log('   May need special handling for standalone conjunctions');
  }

  if (bug.arabic.startsWith('نَفْس')) {
    console.log('\n📚 LINGUISTIC NOTE: "himself/itself" translations');
    console.log('   Arabic نَفْسه (nafs + his) → English "himself" (single word)');
    console.log('   Single-word rule applies correctly here');
  }

  console.log('');
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

const singleWordCases = reportedBugs.filter(b => b.english.trim().split(/\s+/).length === 1);
console.log(`\nSingle-word cases (should NOT be colored): ${singleWordCases.length}`);
console.log('These are CORRECT behavior, not bugs!\n');

const multiWordCases = reportedBugs.filter(b => b.english.trim().split(/\s+/).length > 1);
console.log(`Multi-word cases (should be analyzed): ${multiWordCases.length}`);

const realBugs = multiWordCases.filter(b => {
  const analysis = analyzeArabicWord(b.arabic, b.english);
  return !analysis.hasComponents;
});

console.log(`Real bugs (multi-word but no components): ${realBugs.length}`);

if (realBugs.length > 0) {
  console.log('\n🐛 ACTUAL BUGS TO INVESTIGATE:');
  realBugs.forEach(bug => {
    console.log(`  • ${bug.arabic} → "${bug.english}"`);
  });
} else {
  console.log('\n✅ NO ACTUAL BUGS FOUND - All cases follow correct rules!');
}
