#!/usr/bin/env npx tsx
/**
 * Backfill قول-family verb rows missed by the prior pass.
 *
 * The single-word rule blocks coloring when sentence_words.english is one token,
 * but يَقُولُ etc. carry visible morphology (subject prefix + root + mood diacritic).
 * This rewrites the per-word gloss to a multi-word form so the analyzer can color
 * the morphemes. Sentence-level english is untouched.
 *
 * Snapshots before each UPDATE → scripts/output/backfill-qawl-family-rollback.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAPPINGS: { arabic: string; current: string; new: string; reason: string }[] = [
  { arabic: 'يَقُولُ', current: 'say', new: 'he says', reason: '3sg present indicative' },
  {
    arabic: 'يَقُولُ',
    current: 'Say',
    new: 'He says',
    reason: '3sg present indicative (capitalized)',
  },
  { arabic: 'يَقُولُ', current: 'saying', new: 'he is saying', reason: '3sg present continuous' },
  { arabic: 'يَقُولَ', current: 'say', new: 'he says', reason: '3sg subjunctive' },
  { arabic: 'يَقُولُوا', current: 'say', new: 'they say', reason: '3pl present' },
  { arabic: 'أَقُولُ', current: 'say', new: 'I say', reason: '1sg present' },
  {
    arabic: 'قَالَ',
    current: 'saying',
    new: 'he said',
    reason: 'past tense, gloss was wrong tense',
  },
  { arabic: 'قَالَ', current: 'said:', new: 'he said:', reason: '3sg past with colon' },
  { arabic: 'قَالَ', current: 'say', new: 'he said', reason: 'past tense, gloss was wrong tense' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('DRY RUN — no writes will be made');

  const rollback: {
    appliedAt: string;
    operations: {
      arabic: string;
      oldEnglish: string;
      newEnglish: string;
      reason: string;
      rows: { id: number; sentence_id: number }[];
    }[];
  } = { appliedAt: new Date().toISOString(), operations: [] };

  let totalRowsUpdated = 0;
  let opsApplied = 0;
  let opsNoop = 0;
  let opsErrored = 0;

  for (const m of MAPPINGS) {
    const { data: rows, error: selErr } = await supabaseClient
      .from('sentence_words')
      .select('id, sentence_id')
      .eq('word_form', m.arabic)
      .eq('english', m.current);

    if (selErr) {
      console.error(`  ❌ select failed for ${m.arabic} | ${m.current}: ${selErr.message}`);
      opsErrored++;
      continue;
    }
    if (!rows || rows.length === 0) {
      opsNoop++;
      console.log(`  [noop] ${m.arabic} | '${m.current}'  (no rows)`);
      continue;
    }

    rollback.operations.push({
      arabic: m.arabic,
      oldEnglish: m.current,
      newEnglish: m.new,
      reason: m.reason,
      rows: rows.map(r => ({ id: r.id, sentence_id: r.sentence_id })),
    });

    if (!dryRun) {
      const { error: updErr } = await supabaseClient
        .from('sentence_words')
        .update({ english: m.new })
        .eq('word_form', m.arabic)
        .eq('english', m.current);
      if (updErr) {
        console.error(`  ❌ update failed for ${m.arabic} | ${m.current}: ${updErr.message}`);
        opsErrored++;
        continue;
      }
    }
    totalRowsUpdated += rows.length;
    opsApplied++;
    console.log(
      `  ${dryRun ? '[dry] ' : ''}${m.arabic} | '${m.current}' → '${m.new}'  (${rows.length} rows)`,
    );
  }

  const outDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const rollbackPath = path.resolve(outDir, 'backfill-qawl-family-rollback.json');
  fs.writeFileSync(rollbackPath, JSON.stringify(rollback, null, 2));

  console.log(`\nrollback log → ${rollbackPath}`);
  console.log(`\nSummary:`);
  console.log(`  operations applied: ${opsApplied}`);
  console.log(`  operations no-op:   ${opsNoop}`);
  console.log(`  operations errored: ${opsErrored}`);
  console.log(`  total rows updated: ${totalRowsUpdated}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
