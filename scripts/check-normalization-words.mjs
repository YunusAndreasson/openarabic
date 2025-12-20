/**
 * Check what Arabic letters correspond to transliterations in database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkWords() {
  const wordsToCheck = [
    'fainna',
    'faqad',
    'fa qad',
    'nor',
    'wa la',
    'wala',
    'fama',
    'fa ma',
    'kama',
    'ka ma',
  ];

  console.log('🔍 Checking normalization words in database...\n');

  for (const word of wordsToCheck) {
    const { data, error } = await supabase
      .from('sentence_words')
      .select('arabic_word, english_word')
      .eq('english_word', word)
      .limit(10);

    if (error) {
      console.error(`❌ Error for "${word}": ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ "${word}" NOT FOUND in database`);
      continue;
    }

    console.log(`\n✅ "${word}" found (${data.length} instances):`);

    // Group by Arabic word
    const arabicMap = new Map();
    data.forEach(d => {
      const count = arabicMap.get(d.arabic_word) || 0;
      arabicMap.set(d.arabic_word, count + 1);
    });

    arabicMap.forEach((count, arabic) => {
      // Show codepoints to see exact characters including diacritics
      const codepoints = Array.from(arabic)
        .map(c => {
          const code = c.codePointAt(0);
          return code ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : '';
        })
        .join(' ');

      console.log(`   ${arabic} (${count}x)`);
      console.log(`   Codepoints: ${codepoints}`);
    });
  }

  console.log('\n✨ Done!\n');
}

checkWords().catch(console.error);
