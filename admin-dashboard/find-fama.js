const { createClient } = require('@supabase/supabase-js');

const url = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(url, key);

async function findFama() {
  console.log('🔍 Searching for فما variations...\n');

  // Search for ف followed by م
  const { data, error } = await supabase
    .from('sentence_words')
    .select('word_form, english')
    .like('word_form', 'ف%م%')
    .limit(50);

  if (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`❌ No words found starting with ف and containing م`);
    return;
  }

  console.log(`✅ Found ${data.length} words with pattern ف...م...\n`);

  // Filter to those that look like فما (ف + م + ا)
  const famaLike = data.filter(d => {
    const word = d.word_form;
    // Check if it's ف followed by م followed by ا (with possible diacritics)
    const stripped = word.replace(/[\u064B-\u0652]/g, ''); // Remove diacritics
    return stripped === 'فما';
  });

  if (famaLike.length === 0) {
    console.log('❌ No exact matches for فما pattern found');
    return;
  }

  console.log(`\n✅ Found ${famaLike.length} matches for فما:\n`);

  // Group by unique combinations
  const uniqueCombos = new Map();
  famaLike.forEach(d => {
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

  console.log('\n✨ Done!\n');
}

findFama().catch(console.error);
