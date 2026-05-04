#!/usr/bin/env npx tsx
/**
 * Apply the LLM-judged (Claude reading sentence context) backfills.
 * Snapshot rows before each UPDATE to scripts/output/backfill-llm-judged-rollback.json.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Decision {
  arabic: string;
  current: string;
  new: string;
  reason: string;
}

async function main() {
  const planPath = path.resolve(__dirname, 'output', 'backfill-llm-judged.json');
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8')) as { decisions: Decision[] };
  const decisions = plan.decisions;
  console.log(`Loaded ${decisions.length} judged decisions`);

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

  for (const d of decisions) {
    const { data: rows, error: selErr } = await supabaseClient
      .from('sentence_words')
      .select('id, sentence_id')
      .eq('word_form', d.arabic)
      .eq('english', d.current);

    if (selErr) {
      console.error(`  ❌ select failed for ${d.arabic} | ${d.current}: ${selErr.message}`);
      opsErrored++;
      continue;
    }
    if (!rows || rows.length === 0) {
      opsNoop++;
      if (dryRun) console.log(`  [noop] ${d.arabic} | '${d.current}'  (no rows match)`);
      continue;
    }

    rollback.operations.push({
      arabic: d.arabic,
      oldEnglish: d.current,
      newEnglish: d.new,
      reason: d.reason,
      rows: rows.map(r => ({ id: r.id, sentence_id: r.sentence_id })),
    });

    if (!dryRun) {
      const { error: updErr } = await supabaseClient
        .from('sentence_words')
        .update({ english: d.new })
        .eq('word_form', d.arabic)
        .eq('english', d.current);

      if (updErr) {
        console.error(`  ❌ update failed for ${d.arabic} | ${d.current}: ${updErr.message}`);
        opsErrored++;
        continue;
      }
      totalRowsUpdated += rows.length;
      opsApplied++;
      process.stdout.write(
        `\r  applied ${opsApplied}/${decisions.length}  (rows: ${totalRowsUpdated})`,
      );
    } else {
      console.log(
        `  [dry] ${d.arabic} | '${d.current}' → '${d.new}'  (${rows.length} rows)  ${d.reason}`,
      );
      totalRowsUpdated += rows.length;
      opsApplied++;
    }
  }
  process.stdout.write('\n');

  const rollbackPath = path.resolve(__dirname, 'output', 'backfill-llm-judged-rollback.json');
  fs.writeFileSync(rollbackPath, JSON.stringify(rollback, null, 2));
  console.log(`\nrollback log → ${rollbackPath}`);

  console.log(`\nSummary:`);
  console.log(`  operations applied: ${opsApplied}`);
  console.log(`  operations no-op:   ${opsNoop} (rows no longer match snapshot)`);
  console.log(`  operations errored: ${opsErrored}`);
  console.log(`  total rows updated: ${totalRowsUpdated}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
