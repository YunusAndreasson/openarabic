#!/usr/bin/env npx tsx
/**
 * Fix Database Translation Errors
 *
 * Fixes 2 incorrect English translations:
 * 1. نَفْسَكَ → "with yourself" should be "your soul"
 * 2. وَمِنْهُ → "with some" should be "from it"
 */

import { supabaseClient } from './utils/supabase-standalone';

async function fixTranslations() {
  console.log('🔧 Fixing database translations...\n');

  // Fix 1: نَفْسَكَ
  console.log('1. Fixing نَفْسَكَ → "your soul"');
  const { data: fix1Data, error: fix1Error } = await supabaseClient
    .from('sentence_words')
    .select('id, word_form, english, sentence_id')
    .eq('word_form', 'نَفْسَكَ')
    .eq('english', 'with yourself');

  if (fix1Error) {
    console.error('   ❌ Error querying:', fix1Error);
  } else if (!fix1Data || fix1Data.length === 0) {
    console.log('   ℹ️  No records found (may already be fixed)');
  } else {
    console.log(`   Found ${fix1Data.length} record(s)`);

    const { error: updateError } = await supabaseClient
      .from('sentence_words')
      .update({ english: 'your soul' })
      .eq('word_form', 'نَفْسَكَ')
      .eq('english', 'with yourself');

    if (updateError) {
      console.error('   ❌ Error updating:', updateError);
    } else {
      console.log('   ✅ Updated to "your soul"');
    }
  }

  console.log();

  // Fix 2: وَمِنْهُ
  console.log('2. Fixing وَمِنْهُ → "from it"');
  const { data: fix2Data, error: fix2Error } = await supabaseClient
    .from('sentence_words')
    .select('id, word_form, english, sentence_id')
    .eq('word_form', 'وَمِنْهُ')
    .eq('english', 'with some');

  if (fix2Error) {
    console.error('   ❌ Error querying:', fix2Error);
  } else if (!fix2Data || fix2Data.length === 0) {
    console.log('   ℹ️  No records found (may already be fixed)');
  } else {
    console.log(`   Found ${fix2Data.length} record(s)`);

    const { error: updateError } = await supabaseClient
      .from('sentence_words')
      .update({ english: 'from it' })
      .eq('word_form', 'وَمِنْهُ')
      .eq('english', 'with some');

    if (updateError) {
      console.error('   ❌ Error updating:', updateError);
    } else {
      console.log('   ✅ Updated to "from it"');
    }
  }

  console.log('\n✅ Translation fixes complete!\n');
}

fixTranslations().catch(console.error);
