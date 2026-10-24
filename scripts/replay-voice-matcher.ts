#!/usr/bin/env tsx
/**
 * Replay every real historical voice attempt through the CURRENT matcher.
 *
 * This is the precision gate for any change to `utils/voiceMatching.ts`. The
 * learner's own resolution is the ground truth, and it is the only label that
 * matters, because it is the one thing the app cannot infer:
 *
 *   matched=false, resolution='accept'  → the learner said "no, I got that
 *                                         right". A FALSE NEGATIVE. Recovering
 *                                         these is the entire point of widening.
 *   matched=false, resolution='reject'  → the learner agreed they got it wrong.
 *                                         A TRUE NEGATIVE. Crediting one of
 *                                         these is a REGRESSION, and a worse
 *                                         one than the false negative it came
 *                                         with: a learner who is told they knew
 *                                         a word they did not stops being able
 *                                         to trust the grade at all.
 *
 * So the accept-rule for any widening is asymmetric. Recovering false negatives
 * is worth having; crediting a single reject is not worth any number of them
 * without a deliberate decision. Print both, always, and never report one
 * without the other.
 *
 * WHICH ROWS COUNT. A stored verdict was produced by whatever matcher shipped
 * that day, so rows predating the last behavioural change to this file are
 * graded against a different matcher and their `matched` column cannot be
 * compared to today's. The last such change is `3089f826` (2026-08-11, "stop
 * failing answers the gloss's scaffolding hid"); everything after it is a
 * refactor. So the gate window starts the day after. The full history is still
 * printed, because the drift on the older rows is itself worth looking at — it
 * is the list of verdicts the shipped matcher has since changed its mind about.
 *
 * Usage:  npx tsx scripts/replay-voice-matcher.ts [--verbose] [--since YYYY-MM-DD]
 */
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

import { matchSingleWord } from '../utils/voiceMatching';
import { addAlias, isAliasStorable, normalizeAlias } from '../utils/voiceAliases';

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface Attempt {
  created_at: string;
  root_id: number | null;
  expected: string | null;
  transcript: string | null;
  matched: boolean;
  match_method: string | null;
  resolution: string;
  heard_speech: boolean | null;
  peak_rms: number | null;
  model_id: string | null;
  app_version: string | null;
}

function resolveConfigValue(value: string | undefined): string | undefined {
  const name = /^\$\{([^}]+)\}$/.exec(value ?? '')?.[1];
  return name === undefined ? value : process.env[name];
}

async function credentials(): Promise<{ url: string; key: string }> {
  let url: string | undefined;
  let key: string | undefined;
  try {
    const mcp = JSON.parse(await readFile(resolve(projectRoot, '.mcp.json'), 'utf8')) as {
      mcpServers?: { supabase?: { env?: Record<string, string> } };
    };
    const env = mcp.mcpServers?.supabase?.env ?? {};
    url = resolveConfigValue(env['SUPABASE_URL']);
    key = resolveConfigValue(env['SUPABASE_SERVICE_ROLE_KEY']);
  } catch {
    // Fall through to the CLI.
  }
  if (!url) {
    const constants = await readFile(resolve(projectRoot, 'constants/supabase.ts'), 'utf8');
    url = /SUPABASE_URL\s*=\s*['"]([^'"]+)/.exec(constants)?.[1];
  }
  if (!key && url) {
    const projectRef = new URL(url).hostname.split('.')[0];
    const { stdout } = await execFileAsync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', projectRef ?? '', '--output', 'json'],
      { cwd: projectRoot, maxBuffer: 1024 * 1024 },
    );
    key = (JSON.parse(stdout) as { name: string; api_key: string }[]).find(
      k => k.name === 'service_role',
    )?.api_key;
  }
  if (!url || !key) {
    throw new Error('Supabase URL / service-role key unavailable — authenticate the Supabase CLI');
  }
  return { url, key };
}

/** Day after the last behavioural change to utils/voiceMatching.ts. */
const DEFAULT_GATE_SINCE = '2026-08-12';

async function main(): Promise<void> {
  // Strict, so a mistyped flag throws. The indexOf lookup this replaces read
  // `--verbose` alone as `--since --verbose`, a date every row sorts after, so
  // the gate window silently took in the whole history.
  const { values } = parseArgs({
    args: process.argv.slice(2),
    strict: true,
    allowPositionals: false,
    options: {
      verbose: { type: 'boolean', default: false },
      since: { type: 'string', default: DEFAULT_GATE_SINCE },
    },
  });
  const { verbose, since } = values;
  const { url, key } = await credentials();

  const cols =
    'created_at,root_id,expected,transcript,matched,match_method,resolution,heard_speech,peak_rms,model_id,app_version';
  const response = await fetch(
    `${url}/rest/v1/voice_grading_attempts?select=${cols}&order=created_at.asc&limit=5000`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  const all = (await response.json()) as Attempt[];

  // Only rows where a human actually spoke and the recognizer emitted text.
  // Emulator silence tells us nothing about the matcher.
  const rows = all.filter(
    r =>
      r.heard_speech === true &&
      (r.transcript ?? '').trim() !== '' &&
      (r.peak_rms ?? 0) > 0.001 &&
      (r.expected ?? '').trim() !== '',
  );

  /**
   * Replay WITH the learner's accept-list, rebuilt as it actually grew.
   *
   * The aliases available to any attempt are exactly the transcripts the learner
   * accepted for that same root EARLIER, subject to the same storability rule
   * the app applies. Without this the replay understates the matcher badly — the
   * accept-list is the mechanism specifically meant to absorb a word the
   * recognizer keeps mangling, so a harness blind to it cannot tell a matcher
   * gap from an accept-list that simply had not learned yet.
   */
  const report = (label: string, subset: Attempt[]): void => {
    let reproduced = 0;
    const recovered: Attempt[] = [];
    const regressed: Attempt[] = [];
    const aliasesByRoot = new Map<number, readonly string[]>();

    for (const r of subset) {
      const known = r.root_id == null ? [] : (aliasesByRoot.get(r.root_id) ?? []);
      const result = matchSingleWord({
        spoken: r.transcript ?? '',
        expected: r.expected ?? '',
        aliases: known,
      });
      if (result.matched === r.matched) reproduced += 1;
      if (!r.matched && result.matched) {
        if (r.resolution === 'accept') recovered.push(r);
        else if (r.resolution === 'reject') regressed.push(r);
      }
      // Grow the list the way the app does: only on an accept, only when storable.
      if (
        r.resolution === 'accept' &&
        r.root_id != null &&
        r.transcript &&
        isAliasStorable({ transcript: r.transcript, otherGlosses: [] })
      ) {
        aliasesByRoot.set(r.root_id, addAlias(known, normalizeAlias(r.transcript)));
      }
    }
    const fn = subset.filter(r => !r.matched && r.resolution === 'accept');
    const tn = subset.filter(r => !r.matched && r.resolution === 'reject');
    console.log(`\n${label}  (${subset.length} captures)`);
    console.log(
      `  reproduces the stored verdict on ${reproduced}` +
        ` (${subset.length ? ((reproduced / subset.length) * 100).toFixed(1) : '0'}%)`,
    );
    console.log(
      `  RECOVER  ${recovered.length}/${fn.length} false negatives` +
        ` (learner said they were right)`,
    );
    console.log(
      `  CREDIT   ${regressed.length}/${tn.length} the learner said were WRONG` +
        `  ${regressed.length === 0 ? '← good' : '← check each one'}`,
    );
    if (verbose || regressed.length > 0) {
      for (const r of recovered) {
        console.log(`    + recovered  exp="${r.expected}"  got="${r.transcript}"`);
      }
      for (const r of regressed) {
        console.log(
          `    ! credited   exp="${r.expected}"  got="${r.transcript}"  (${r.created_at.slice(0, 10)})`,
        );
      }
    }
  };

  report('FULL HISTORY — includes rows graded by older matchers', rows);
  report(
    `GATE WINDOW — since ${since}, i.e. today's matcher`,
    rows.filter(r => r.created_at >= since),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
