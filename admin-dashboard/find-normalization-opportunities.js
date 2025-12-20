const { createClient } = require('@supabase/supabase-js');

const url = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(url, key);

async function findOpportunities() {
  console.log('🔍 Searching for normalization opportunities...\n');

  // Get all words with 2-word English translations
  const { data, error } = await supabase
    .from('sentence_words')
    .select('word_form, english')
    .limit(5000);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Loaded ${data.length} words\n`);

  // Filter to 2-word translations
  const twoWordTranslations = data.filter(d => {
    const words = d.english.trim().split(/\s+/);
    return words.length === 2;
  });

  console.log(`Found ${twoWordTranslations.length} two-word translations\n`);

  // Group by Arabic word
  const arabicGroups = new Map();
  twoWordTranslations.forEach(d => {
    // Strip diacritics for grouping
    const stripped = d.word_form.replace(/[\u064B-\u0652]/g, '');

    if (!arabicGroups.has(stripped)) {
      arabicGroups.set(stripped, new Map());
    }

    const englishMap = arabicGroups.get(stripped);
    englishMap.set(d.english, (englishMap.get(d.english) || 0) + 1);
  });

  // Find Arabic words with multiple different 2-word translations
  const candidates = [];
  arabicGroups.forEach((translations, arabic) => {
    if (translations.size > 1) {
      const total = Array.from(translations.values()).reduce((a, b) => a + b, 0);
      candidates.push({
        arabic,
        translations: Array.from(translations.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([eng, count]) => ({ english: eng, count })),
        total
      });
    }
  });

  // Sort by total occurrences
  candidates.sort((a, b) => b.total - a.total);

  console.log(`\n📊 Top normalization candidates (${candidates.length} total):\n`);

  // Show top 30
  candidates.slice(0, 30).forEach((candidate, i) => {
    console.log(`\n${i + 1}. ${candidate.arabic} (${candidate.total} total occurrences):`);
    candidate.translations.forEach(t => {
      console.log(`   "${t.english}" (${t.count}x)`);
    });
  });

  console.log('\n✨ Done!\n');
}

findOpportunities().catch(console.error);
