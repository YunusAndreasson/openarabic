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

const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL']!;
const supabaseAnonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

async function validateNormalizations() {
  console.log('🔍 Validating normalization rules against database...\n');

  for (const rule of TRANSLATION_NORMALIZATION_RULES) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 Rule: ${rule.arabic} → "${rule.normalizedEnglish}"`);
    console.log(`   ${rule.description}`);
    console.log(`   Normalized English: "${rule.normalizedEnglish}"`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Check if this Arabic word exists in the database
    const { data: wordsWithArabic, error: arabicError } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .eq('word_form', rule.arabic)
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
        .select('word_form, english')
        .ilike('word_form', `%${rule.arabic.substring(0, 2)}%`)
        .limit(5);

      if (similar && similar.length > 0) {
        console.log(`   Similar words found:`);
        similar.forEach(w => console.log(`     - ${w.word_form} → "${w.english}"`));
      }
      continue;
    }

    console.log(`✅ Found ${wordsWithArabic.length} instances of "${rule.arabic}" in database`);

    // Group by English translation
    const translations = new Map<string, number>();
    wordsWithArabic.forEach(w => {
      const count = translations.get(w.english) ?? 0;
      translations.set(w.english, count + 1);
    });

    const normalized = rule.normalizedEnglish.toLowerCase();

    console.log(`\n   Database translations for "${rule.arabic}":`);
    Array.from(translations.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([english, count]) => {
        const isNormalized = english.toLowerCase() === normalized;
        const marker = isNormalized ? '✓' : '✗';
        console.log(
          `     ${marker} "${english}" (${count}x) ${
            isNormalized ? '- ALREADY NORMALIZED' : '- WOULD BE REWRITTEN'
          }`,
        );
      });

    // Where else does the normalized English already appear? If it maps to a
    // different Arabic word, applying this rule would collide with that usage.
    const { data: matches, error } = await supabase
      .from('sentence_words')
      .select('word_form, english')
      .eq('english', rule.normalizedEnglish)
      .limit(5);

    if (error) {
      console.error(`   ❌ Error querying "${rule.normalizedEnglish}":`, error.message);
      continue;
    }

    if (!matches || matches.length === 0) {
      console.log(`   ⚠️  "${rule.normalizedEnglish}" NOT FOUND in database yet`);
      continue;
    }

    const arabicVariants = new Set(matches.map(m => m.word_form));
    if (!arabicVariants.has(rule.arabic)) {
      console.log(`   ⚠️  "${rule.normalizedEnglish}" exists but with DIFFERENT Arabic:`);
      arabicVariants.forEach(arabic => {
        console.log(`       - Found: ${arabic} (expected: ${rule.arabic})`);
      });
    } else {
      console.log(
        `   ✅ "${rule.normalizedEnglish}" → ${rule.arabic} (${matches.length} instances)`,
      );
    }
  }

  console.log('\n\n✨ Validation complete!\n');
}

validateNormalizations().catch(console.error);
