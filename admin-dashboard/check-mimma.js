const { createClient } = require('@supabase/supabase-js');

const url = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(url, key);

async function checkMimma() {
  console.log('🔍 Checking "mimma" and related translations...\n');

  // Search for English "mimma", "for what", "from what"
  const searches = ['mimma', 'for what', 'from what', 'of what'];

  for (const term of searches) {
    const { data, error } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .eq('english', term)
      .limit(20);

    if (error) {
      console.error(`Error for "${term}":`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ "${term}": not found`);
      continue;
    }

    console.log(`\n✅ "${term}" found (${data.length} instances):`);

    // Group by Arabic word
    const arabicMap = new Map();
    data.forEach(d => {
      const stripped = d.word_form.replace(/[\u064B-\u0652]/g, '');
      arabicMap.set(stripped, (arabicMap.get(stripped) || 0) + 1);
    });

    arabicMap.forEach((count, arabic) => {
      console.log(`  ${arabic} (${count}x)`);
    });
  }

  return;

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Not found');
    return;
  }

  // Filter to exact match (strip diacritics)
  const matches = data.filter(d => {
    const stripped = d.word_form.replace(/[\u064B-\u0652]/g, '');
    return stripped === 'مما';
  });

  console.log(`✅ Found ${matches.length} instances of مما:\n`);

  // Group by English
  const englishMap = new Map();
  matches.forEach(d => {
    englishMap.set(d.english, (englishMap.get(d.english) || 0) + 1);
  });

  // Show sorted by frequency
  Array.from(englishMap.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([english, count]) => {
      const pct = ((count / matches.length) * 100).toFixed(0);
      console.log(`  "${english}" (${count}x - ${pct}%)`);
    });

  // Show unique word forms with codepoints
  console.log('\n📝 Word forms:');
  const wordForms = new Set(matches.map(d => d.word_form));
  wordForms.forEach(form => {
    const codes = Array.from(form)
      .map(c => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
      .join(' ');
    console.log(`  ${form} [${codes}]`);
  });
}

checkMimma().catch(console.error);
