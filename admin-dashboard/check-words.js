const { createClient } = require('@supabase/supabase-js');

const url = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(url, key);

async function checkWords() {
  // First, check what English translations exist for our Arabic words
  console.log('🔍 Checking what English translations exist for our Arabic words:\n');

  const arabicWords = ['فإن', 'فقد', 'ولا', 'فما'];

  for (const arabic of arabicWords) {
    // Try both exact match and with diacritics
    const { data, error } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .or(`word_form.eq.${arabic},word_form.like.${arabic}%`)
      .limit(20);

    if (error) {
      console.log(`❌ ${arabic}: ERROR - ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ "${arabic}": NOT FOUND (no diacritics)`);
      continue;
    }

    console.log(`\n✅ "${arabic}" found (${data.length} instances):`);
    const englishMap = new Map();
    data.forEach(d => {
      const count = englishMap.get(d.english) || 0;
      englishMap.set(d.english, count + 1);
    });

    englishMap.forEach((count, english) => {
      console.log(`   "${english}" (${count}x)`);
    });
  }

  console.log('\n\n🔍 Now checking English words...\n');

  const wordsToCheck = ['fainna', 'faqad', 'fa qad', 'nor', 'wa la', 'wala'];

  console.log('🔍 Checking words in database...\n');

  for (const word of wordsToCheck) {
    const { data, error } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .eq('english', word)
      .limit(10);

    if (error) {
      console.log(`❌ ${word}: ERROR - ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ "${word}": NOT FOUND in database`);
      continue;
    }

    console.log(`\n✅ "${word}" found (${data.length} instances):`);

    // Group by Arabic word
    const arabicMap = new Map();
    data.forEach(d => {
      const count = arabicMap.get(d.word_form) || 0;
      arabicMap.set(d.word_form, count + 1);
    });

    arabicMap.forEach((count, arabic) => {
      const codes = Array.from(arabic)
        .map(c => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
        .join(' ');
      console.log(`   "${arabic}" (${count}x)`);
      console.log(`   Codepoints: [${codes}]`);
    });
  }

  console.log('\n✨ Done!\n');
}

checkWords().catch(e => console.error('Fatal error:', e));
