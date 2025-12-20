const { createClient } = require('@supabase/supabase-js');

const url = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(url, key);

async function checkImpact() {
  console.log('🔍 Checking normalization impact for candidates...\n');

  const candidates = [
    { arabic: 'فمن', name: 'fa + man (so + who)' },
    { arabic: 'ومن', name: 'wa + man (and + who)' },
    { arabic: 'بما', name: 'bi + ma (with + what)' },
    { arabic: 'وإن', name: 'wa + in (and + if/indeed)' },
    { arabic: 'فإذا', name: 'fa + idha (so + when)' },
    { arabic: 'وإذا', name: 'wa + idha (and + when)' },
  ];

  for (const candidate of candidates) {
    // Get all occurrences (exact match without diacritics)
    const { data: exactData, error: exactError } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .eq('word_form', candidate.arabic)
      .limit(100);

    // Also try with diacritics pattern
    const { data: patternData, error: patternError } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .or(`word_form.eq.${candidate.arabic},word_form.like.${candidate.arabic}%`)
      .limit(100);

    const data = patternData || exactData;
    const error = patternError || exactError;

    if (error) {
      console.error(`❌ Error for ${candidate.arabic}: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`❌ ${candidate.arabic} (${candidate.name}): NOT FOUND\n`);
      continue;
    }

    // Strip diacritics and group
    const stripped = candidate.arabic;
    const matchingWords = data.filter(d => {
      const wordStripped = d.word_form.replace(/[\u064B-\u0652]/g, '');
      return wordStripped === stripped;
    });

    console.log(`\n✅ ${candidate.arabic} (${candidate.name})`);
    console.log(`   Total occurrences: ${matchingWords.length}`);

    // Group by English translation
    const englishMap = new Map();
    matchingWords.forEach(d => {
      englishMap.set(d.english, (englishMap.get(d.english) || 0) + 1);
    });

    console.log(`   Unique translations: ${englishMap.size}`);
    console.log(`   Translations:`);

    // Sort by count
    Array.from(englishMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([english, count]) => {
        const pct = ((count / matchingWords.length) * 100).toFixed(0);
        console.log(`     "${english}" (${count}x - ${pct}%)`);
      });
  }

  console.log('\n✨ Done!\n');
}

checkImpact().catch(console.error);
