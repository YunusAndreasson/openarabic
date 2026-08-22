#!/usr/bin/env node
/**
 * Upsert the generated root explanations into public.root_enrichment.
 *
 * Rows come from translate/word_enrichment/seed_root_enrichment.json by default,
 * emitted by build_ts.py alongside the .sql version so the two sinks cannot
 * drift. Pass a different path as the first argument to seed the root-pipeline
 * fan-out (seed_root_fanout.json, from fan_out.py) instead — that file holds one
 * row per HEADWORD rather than one per generated record, because the app looks
 * this table up by the id of a single dictionary entry.
 *
 * A .sql twin is deliberately NOT emitted for the fan-out: at ~13k rows it runs
 * to tens of megabytes, which no SQL editor will take.
 *
 * Needs the service-role key: the table is deliberately read-only to anon (it
 * holds published dictionary content and the anon key ships inside the app
 * bundle). Creating the table is NOT possible from here — PostgREST exposes no
 * DDL at any privilege level — so supabase/migrations/20260821_create_root_enrichment.sql
 * must have been applied first.
 *
 * Idempotent: upserts on the root_id primary key.
 *
 *   node scripts/seed-root-enrichment.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHUNK = 50;

/** Minimal .env reader — the repo has no dotenv dependency at the root. */
function readEnvFile(path) {
  const out = {};
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return out;
  }
  for (const line of raw.split('\n')) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match) continue;
    out[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

async function main() {
  const env = { ...readEnvFile(resolve(projectRoot, 'social/.env')), ...process.env };
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (looked in social/.env and the environment).',
    );
    process.exit(1);
  }

  const source = process.argv[2] ?? 'translate/word_enrichment/seed_root_enrichment.json';
  const rows = JSON.parse(readFileSync(resolve(projectRoot, source), 'utf8'));
  console.log(`${rows.length} row(s) from ${source} -> ${url}`);

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('root_enrichment')
      .upsert(batch, { onConflict: 'root_id' });
    if (error) {
      console.error(`\nbatch at ${i} failed: ${error.message}`);
      if (error.message.includes('root_enrichment')) {
        console.error('Has supabase/migrations/20260821_create_root_enrichment.sql been applied?');
      }
      process.exit(1);
    }
    done += batch.length;
    console.log(`  ${done}/${rows.length}`);
  }

  // Prune what is no longer publishable.
  //
  // Upsert alone leaves a word live forever once published. عليه ("upon him")
  // shipped in the first seed, the judge later ruled it a preposition with an
  // enclitic pronoun rather than a derived lexeme — and it stayed in production,
  // because nothing removes a row the pipeline has stopped emitting. Withholding
  // a word has to mean unpublishing it, or the review step only ever applies to
  // words nobody has seen yet.
  const keep = new Set(rows.map(r => r.root_id));
  const { data: liveRows, error: liveError } = await supabase
    .from('root_enrichment')
    .select('root_id');
  if (liveError) {
    console.error(`could not list live rows to prune: ${liveError.message}`);
    process.exit(1);
  }
  const stale = liveRows.map(r => r.root_id).filter(id => !keep.has(id));
  if (stale.length > rows.length) {
    // The prune exists to unpublish a word the judge withheld, which is always a
    // handful. Deleting MORE rows than we just wrote means this file is not the
    // whole publishable set — seeding a partial batch would silently wipe the
    // rest of the table. Refuse rather than destroy, and say what to do.
    console.error(
      `\nrefusing to prune ${stale.length} row(s) after upserting only ${rows.length}.` +
        '\nThat ratio means this file is a partial batch, not the full publishable set.' +
        '\nSeed the complete file, or clear the table deliberately first.',
    );
    process.exit(1);
  }
  if (stale.length) {
    console.log(
      `\npruning ${stale.length} row(s) no longer publishable: ${stale.length > 20 ? `${stale.slice(0, 20).join(', ')}…` : stale.join(', ')}`,
    );
    const { error: delError } = await supabase
      .from('root_enrichment')
      .delete()
      .in('root_id', stale);
    if (delError) {
      console.error(`prune failed: ${delError.message}`);
      process.exit(1);
    }
  } else {
    console.log('\nnothing to prune');
  }

  const { count, error: countError } = await supabase
    .from('root_enrichment')
    .select('root_id', { count: 'exact', head: true });
  if (countError) {
    console.error(`upserted ${done}, but the verification count failed: ${countError.message}`);
    process.exit(1);
  }
  console.log(`\ndone — table now holds ${count} row(s)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
