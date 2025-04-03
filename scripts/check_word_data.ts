import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const supabaseKey =
  'REDACTED_LEAKED_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWordData() {
  // Get a sample of study words with all their relationships
  const { data: words, error } = await supabase
    .from('study_words')
    .select(
      `
      *,
      sentence_word:sentence_words (
        *,
        root:roots (*),
        word_type:word_types (*),
        sentence:article_sentences (*)
      ),
      reviews (
        reviewed_at,
        grade
      )
    `
    )
    .limit(5);

  if (error) {
    console.error('Error fetching words:', error);
    return;
  }

  console.log('\nSample word data structure:');
  if (words && words.length > 0) {
    const sampleWord = words[0];
    console.log(JSON.stringify(sampleWord, null, 2));
  }
}

checkWordData().catch(console.error);
