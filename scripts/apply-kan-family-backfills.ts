#!/usr/bin/env npx tsx
/**
 * Apply per-row decisions for kan-family backfills. Different from the
 * (word_form, english)-keyed appliers: each row was judged in isolation
 * because the same (word_form, english) maps to different subjects in
 * different sentences (e.g., كَانَ|is → "he is" or "it is" by context).
 *
 * Updates by sentence_words.id; snapshots before write to a rollback JSON.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Decision { id: number; arabic: string; current: string; new: string; reason: string; }

async function main() {
  const planPath = path.resolve(__dirname, 'output', 'kan-family-decisions.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as { decisions: Decision[] };
  const decisions = plan.decisions;
  console.log(`Loaded ${decisions.length} per-row decisions`);

  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('DRY RUN — no writes will be made');

  const rollback: { appliedAt: string; operations: (Decision & { sentence_id?: number; verifiedCurrent: string })[] } = {
    appliedAt: new Date().toISOString(),
    operations: [],
  };

  let opsApplied = 0, opsNoop = 0, opsErrored = 0;

  for (const d of decisions) {
    // Verify the row still matches current state (idempotent, safe re-run)
    const { data: row, error: selErr } = await supabaseClient
      .from('sentence_words')
      .select('id, sentence_id, word_form, english')
      .eq('id', d.id)
      .single();

    if (selErr) {
      console.error(`  ❌ select id=${d.id}: ${selErr.message}`);
      opsErrored++;
      continue;
    }
    if (row.word_form !== d.arabic || row.english !== d.current) {
      console.log(`  [noop] id=${d.id} state changed: word_form="${row.word_form}" english="${row.english}" (expected ${d.arabic}|${d.current})`);
      opsNoop++;
      continue;
    }

    rollback.operations.push({ ...d, sentence_id: row.sentence_id, verifiedCurrent: row.english });

    if (!dryRun) {
      const { error: updErr } = await supabaseClient
        .from('sentence_words')
        .update({ english: d.new })
        .eq('id', d.id);
      if (updErr) {
        console.error(`  ❌ update id=${d.id}: ${updErr.message}`);
        opsErrored++;
        continue;
      }
    }
    console.log(`  ${dryRun ? '[dry] ' : ''}id=${d.id} ${d.arabic} '${d.current}' → '${d.new}'  (${d.reason})`);
    opsApplied++;
  }

  const rollbackPath = path.resolve(__dirname, 'output', 'backfill-kan-family-rollback.json');
  fs.writeFileSync(rollbackPath, JSON.stringify(rollback, null, 2));
  console.log(`\nrollback log → ${rollbackPath}`);
  console.log(`\nSummary: applied=${opsApplied}  no-op=${opsNoop}  errored=${opsErrored}`);
}

main().catch(e => { console.error(e); process.exit(1); });
