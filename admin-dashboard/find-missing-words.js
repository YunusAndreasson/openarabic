const { createClient } = require('@supabase/supabase-js');

const url = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(url, key);

async function findWords() {
  console.log('🔍 Searching for missing Arabic words with diacritics...\n');

  // Search for words starting with ف (fa)
  const searches = [
    { pattern: 'فقد', name: 'faqad pattern' },
    { pattern: 'فما', name: 'fama pattern' },
    { pattern: 'فَقَد', name: 'faqad with fatha' },
    { pattern: 'فَما', name: 'fama with fatha' },
  ];

  for (const search of searches) {
    const { data, error } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .ilike('word_form', `${search.pattern}%`)
      .limit(10);

    if (error) {
      console.log(`❌ ${search.name}: ERROR - ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ "${search.pattern}" (${search.name}): NOT FOUND`);
      continue;
    }

    console.log(`\n✅ "${search.pattern}" (${search.name}) found (${data.length} instances):`);

    // Show unique combinations
    const uniqueCombos = new Map();
    data.forEach(d => {
      const key = `${d.word_form}|${d.english}`;
      uniqueCombos.set(key, (uniqueCombos.get(key) || 0) + 1);
    });

    uniqueCombos.forEach((count, combo) => {
      const [arabic, english] = combo.split('|');
      const codes = Array.from(arabic)
        .map(c => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
        .join(' ');
      console.log(`   ${arabic} → "${english}" (${count}x)`);
      console.log(`   [${codes}]`);
    });
  }

  console.log('\n✨ Done!\n');
}

findWords().catch(console.error);
