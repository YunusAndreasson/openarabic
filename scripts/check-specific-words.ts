#!/usr/bin/env npx tsx

import { supabaseClient } from './utils/supabase-standalone';
import { analyzeArabicWord } from '../utils/arabicWordAnalysis';

async function main() {
  // Check specific suspicious cases
  const cases = [
    { arabic: 'رَبِّهِ', english: 'their Lord' },
    { arabic: 'رَبَّهُ', english: 'with his Lord' },
    { arabic: 'لَهُ', english: 'for him' },
    { arabic: 'بِهِ', english: 'to Him' },
  ];

  console.log('Checking specific suspicious cases...\n');

  for (const testCase of cases) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Arabic: ${testCase.arabic}`);
    console.log(`English: ${testCase.english}`);

    const analysis = analyzeArabicWord(testCase.arabic, testCase.english);

    console.log(`\nAnalysis:`);
    console.log(`  Has Components: ${analysis.hasComponents}`);
    console.log(
      `  Prefixes: ${analysis.prefixes.map(p => `${p.arabicMatch} → ${p.englishMatches.join(',')}`).join(' + ')}`,
    );
    console.log(
      `  Suffix: ${analysis.suffix ? `${analysis.suffix.arabicMatch} → ${analysis.suffix.englishMatches.join(',')}` : 'none'}`,
    );
    console.log(`  Remaining: "${analysis.remainingArabic}" → "${analysis.remainingEnglish}"`);

    // Expert Analysis
    console.log(`\n📊 Expert Analysis:`);

    if (testCase.arabic === 'رَبِّهِ' && testCase.english === 'their Lord') {
      console.log(`  ❌ TRANSLATION ERROR: Arabic has ه (his) but English says "their"`);
      console.log(`  ✓ Coloring is CORRECT: ه should be colored as possessive`);
      console.log(`  Fix: English should be "his Lord" not "their Lord"`);
    }

    if (testCase.arabic === 'رَبَّهُ' && testCase.english === 'with his Lord') {
      console.log(`  ❌ TRANSLATION ERROR: English says "with" but Arabic has no ب prefix`);
      console.log(`  ✓ Coloring is CORRECT: ه should be colored as possessive`);
      console.log(`  Fix: English should be "his Lord" not "with his Lord"`);
    }

    if (testCase.arabic === 'لَهُ' && testCase.english === 'for him') {
      console.log(`  ✓ CORRECT: ل (for) + ه (him) = preposition + pronoun`);
      console.log(`  This is a valid compound particle`);
    }

    if (testCase.arabic === 'بِهِ' && testCase.english === 'to Him') {
      console.log(`  ⚠️  CHECK: ب usually means "with/by" not "to"`);
      console.log(`  English might be interpretive translation`);
      console.log(`  Coloring is correct for ب (preposition) + ه (pronoun)`);
    }

    console.log('');
  }

  // Now query actual database for these words
  console.log('\n\n📚 Database Query Results:\n');

  const { data, error } = await supabaseClient
    .from('sentence_words')
    .select('word_form, english, sentence_id')
    .in(
      'word_form',
      cases.map(c => c.arabic),
    )
    .limit(20);

  if (error) {
    console.error('Error querying database:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No matches found in database');
    return;
  }

  for (const row of data) {
    console.log(`${row.word_form} → ${row.english} (sentence_id: ${row.sentence_id})`);
  }
}

main();
