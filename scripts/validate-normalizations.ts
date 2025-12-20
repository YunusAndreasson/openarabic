/**
 * Validate normalization rules against actual database content
 *
 * This script checks:
 * 1. Do the Arabic letters in our rules actually exist in the database?
 * 2. Do the transliterations match actual translations in the database?
 * 3. Are we missing any common patterns?
 */

import { createClient } from '@supabase/supabase-js';
import { TRANSLATION_NORMALIZATION_RULES } from '../constants/translationNormalizations';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

interface WordMatch {
  arabic: string;
  english: string;
  count: number;
  sentences: string[];
}

async function validateNormalizations() {
  console.log('🔍 Validating normalization rules against database...\n');

  for (const rule of TRANSLATION_NORMALIZATION_RULES) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 Rule: ${rule.arabic} → "${rule.normalizedEnglish}"`);
    console.log(`   ${rule.description}`);
    console.log(`   Transliterations: ${rule.transliterations.join(', ')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Check if this Arabic word exists in the database
    const { data: wordsWithArabic, error: arabicError } = await supabase
      .from('sentence_words')
      .select('arabic_word, english_word')
      .eq('arabic_word', rule.arabic)
      .limit(10);

    if (arabicError) {
      console.error(`❌ Error querying for ${rule.arabic}:`, arabicError.message);
      continue;
    }

    if (!wordsWithArabic || wordsWithArabic.length === 0) {
      console.log(`⚠️  WARNING: Arabic "${rule.arabic}" NOT FOUND in database!`);

      // Search for similar patterns
      const { data: similar } = await supabase
        .from('sentence_words')
        .select('arabic_word, english_word')
        .ilike('arabic_word', `%${rule.arabic.substring(0, 2)}%`)
        .limit(5);

      if (similar && similar.length > 0) {
        console.log(`   Similar words found:`);
        similar.forEach(w => console.log(`     - ${w.arabic_word} → "${w.english_word}"`));
      }
      continue;
    }

    console.log(`✅ Found ${wordsWithArabic.length} instances of "${rule.arabic}" in database`);

    // Group by English translation
    const translations = new Map<string, number>();
    wordsWithArabic.forEach(w => {
      const count = translations.get(w.english_word) || 0;
      translations.set(w.english_word, count + 1);
    });

    console.log(`\n   Database translations for "${rule.arabic}":`);
    Array.from(translations.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([english, count]) => {
        const isInRule = rule.transliterations.some(t =>
          t.toLowerCase() === english.toLowerCase()
        );
        const marker = isInRule ? '✓' : '✗';
        console.log(`     ${marker} "${english}" (${count}x) ${isInRule ? '- COVERED' : '- NOT IN RULE'}`);
      });

    // Check each transliteration
    for (const trans of rule.transliterations) {
      const { data: matches, error } = await supabase
        .from('sentence_words')
        .select('arabic_word, english_word')
        .eq('english_word', trans)
        .limit(5);

      if (error) {
        console.error(`   ❌ Error querying "${trans}":`, error.message);
        continue;
      }

      if (!matches || matches.length === 0) {
        console.log(`   ⚠️  Transliteration "${trans}" NOT FOUND in database`);
        continue;
      }

      // Check if the Arabic matches our rule
      const arabicVariants = new Set(matches.map(m => m.arabic_word));
      const hasMatch = arabicVariants.has(rule.arabic);

      if (!hasMatch) {
        console.log(`   ⚠️  "${trans}" exists but with DIFFERENT Arabic:`);
        arabicVariants.forEach(arabic => {
          console.log(`       - Found: ${arabic} (expected: ${rule.arabic})`);
        });
      } else {
        console.log(`   ✅ "${trans}" → ${rule.arabic} (${matches.length} instances)`);
      }
    }
  }

  console.log('\n\n✨ Validation complete!\n');
}

validateNormalizations().catch(console.error);
