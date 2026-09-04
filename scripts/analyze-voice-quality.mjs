#!/usr/bin/env node
/**
 * Voice grading quality over time — did something recently make it worse?
 *
 * Reads `voice_grading_attempts` (service role, RLS-bypassing) and segments the
 * recent history by app version and by day, because the question is almost never
 * "is the recognizer good" but "did a change we shipped make it worse".
 *
 * The metrics, and why each one is here:
 *
 * - **credited**   — the learner got the card. `matched` OR the panel `accept`.
 *                    The headline, but on its own it cannot say WHY it moved.
 * - **empty**      — the recognizer returned nothing. This is a CAPTURE failure,
 *                    not a recognition one: no model change fixes it, and it is
 *                    what a mis-tuned energy gate produces.
 * - **override**   — `matched=false` but the learner said "I got it". A genuine
 *                    false negative: heard something, graded it wrong.
 * - **stop_reason**— `noSpeech` rising is the signature of a gate that never
 *                    confirms speech; `maxDuration`/`watchdog` of one that never
 *                    closes.
 * - **peak_rms**   — capture gain. Regimes sit ~17 dB apart (iOS raw mode), so a
 *                    shift here means the input path changed, not the model.
 *
 * Usage:
 *   node scripts/analyze-voice-quality.mjs [--limit 400] [--days 30]
 *   node scripts/analyze-voice-quality.mjs --latency [--limit 150] [--days 30]
 *
 * --latency reads iOS timing fields only and prints aggregate percentiles,
 * including the restore-mode/input breakdown when instrumented rows exist.
 */
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A gap longer than this starts a new "session" for clustering. */
const SESSION_GAP_MS = 20 * 60 * 1000;

function resolveConfigValue(value) {
  const match = /^\$\{([^}]+)\}$/.exec(value ?? '');
  return match ? process.env[match[1]] : value;
}

/** Same resolution order as scripts/practice-ground-truth.mjs. */
async function credentials() {
  let url;
  let key;
  try {
    const mcp = JSON.parse(await readFile(resolve(projectRoot, '.mcp.json'), 'utf8'));
    const env = mcp.mcpServers?.supabase?.env ?? {};
    url = resolveConfigValue(env.SUPABASE_URL);
    key = resolveConfigValue(env.SUPABASE_SERVICE_ROLE_KEY);
  } catch {
    // No .mcp.json, or no supabase entry in it — fall through to the CLI.
  }

  if (!url) {
    const constants = await readFile(resolve(projectRoot, 'constants/supabase.ts'), 'utf8');
    url = constants.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
  }

  if (!key && url) {
    const projectRef = new URL(url).hostname.split('.')[0];
    const { stdout } = await execFileAsync(
      'supabase',
      ['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'],
      { cwd: projectRoot, maxBuffer: 1024 * 1024 },
    );
    key = JSON.parse(stdout).find(k => k.name === 'service_role')?.api_key;
  }

  if (!url || !key) {
    throw new Error('Supabase URL / service-role key unavailable — authenticate the Supabase CLI');
  }
  return { url, key };
}

async function rest(url, key, path) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json();
}

const pct = (n, d) => (d === 0 ? '  n/a' : `${((n / d) * 100).toFixed(1).padStart(5)}%`);

function summarise(rows) {
  const n = rows.length;
  const credited = rows.filter(r => r.matched || r.resolution === 'accept').length;
  const empty = rows.filter(r => !r.transcript || r.transcript.trim() === '').length;
  const override = rows.filter(r => !r.matched && r.resolution === 'accept').length;
  const retry = rows.filter(r => r.resolution === 'retry').length;
  const heard = rows.filter(r => r.heard_speech).length;
  const rms = rows.map(r => r.peak_rms).filter(v => typeof v === 'number' && v > 0);
  const dur = rows.map(r => r.duration_ms).filter(v => typeof v === 'number' && v > 0);
  const median = arr => {
    if (arr.length === 0) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const stops = {};
  for (const r of rows) stops[r.stop_reason ?? 'null'] = (stops[r.stop_reason ?? 'null'] ?? 0) + 1;
  return {
    n,
    credited,
    empty,
    override,
    retry,
    heard,
    stops,
    medRms: median(rms),
    medDur: median(dur),
  };
}

function printGroup(label, rows) {
  const s = summarise(rows);
  const topStops = Object.entries(s.stops)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ');
  console.log(
    `${label.padEnd(22)} n=${String(s.n).padStart(4)}  credited ${pct(s.credited, s.n)}` +
      `  empty ${pct(s.empty, s.n)}  override ${pct(s.override, s.n)}` +
      `  retry ${pct(s.retry, s.n)}  heard ${pct(s.heard, s.n)}` +
      `  rms ${s.medRms === null ? '   n/a' : s.medRms.toFixed(4)}` +
      `  ${s.medDur === null ? '' : `${String(s.medDur).padStart(5)}ms`}  ${topStops}`,
  );
}

async function printIosLatency(url, key, since, limit) {
  const cols = [
    'created_at',
    'app_version',
    'first_buffer_ms',
    'tap_ms:meta->tapToCapturingMs',
    'arm_stages:meta->armStages',
  ].join(',');
  const rows = await rest(
    url,
    key,
    `voice_grading_attempts?select=${cols}&platform=eq.ios&created_at=gte.${since}` +
      `&order=created_at.desc&limit=${limit}`,
  );
  if (rows.length === 0) {
    console.log('No iOS attempts in the requested period.');
    return;
  }
  const stats = values => {
    const sorted = values
      .filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)
      .sort((a, b) => a - b);
    if (sorted.length === 0) return { samples: 0, medianMs: null, p90Ms: null };
    return {
      samples: sorted.length,
      medianMs: sorted[Math.floor(sorted.length * 0.5)],
      p90Ms: sorted[Math.floor(sorted.length * 0.9)],
    };
  };
  const versions = [...new Set(rows.map(r => r.app_version))];
  for (const version of versions) {
    const group = rows.filter(r => r.app_version === version);
    console.log(
      `\niOS ${version ?? 'unknown'}: ${group.length} attempts, ` +
        `${group.at(-1).created_at} → ${group[0].created_at}`,
    );
    console.table({
      tapToCapturing: stats(group.map(r => r.tap_ms)),
      tapToArm: stats(group.map(r => r.arm_stages?.tapToArmMs)),
      restore: stats(group.map(r => r.arm_stages?.restoreMs)),
      restoreWait: stats(group.map(r => r.arm_stages?.restoreWaitMs)),
      restoreMode: stats(group.map(r => r.arm_stages?.restoreModeMs)),
      restoreInput: stats(group.map(r => r.arm_stages?.restoreInputMs)),
      firstBuffer: stats(group.map(r => r.first_buffer_ms)),
    });
  }
  console.log(
    'Missing timing fields are excluded, not treated as zero. Spans overlap; do not add percentiles.',
  );
}

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(args[args.indexOf('--limit') + 1]) || 400;
  const days = Number(args[args.indexOf('--days') + 1]) || 30;

  const { url, key } = await credentials();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  if (args.includes('--latency')) {
    await printIosLatency(url, key, since, limit);
    return;
  }

  const cols = [
    'id',
    'created_at',
    'user_id',
    'expected',
    'transcript',
    'matched',
    'match_method',
    'similarity',
    'resolution',
    'attempt_index',
    'duration_ms',
    'stop_reason',
    'heard_speech',
    'peak_rms',
    'model_id',
    'platform',
    'app_version',
  ].join(',');

  const rows = await rest(
    url,
    key,
    `voice_grading_attempts?select=${cols}&created_at=gte.${since}` +
      `&order=created_at.desc&limit=${limit}`,
  );

  if (rows.length === 0) {
    console.log(`No attempts in the last ${days} days.`);
    return;
  }

  rows.reverse(); // oldest first, so the tables read chronologically

  console.log(
    `\n${rows.length} attempts, ${rows[0].created_at.slice(0, 16)} → ${rows.at(-1).created_at.slice(0, 16)}\n`,
  );

  // Sessions: attempts clustered per user by a quiet gap. The table has no
  // session id, and "the last 50 sessions" is the unit the question is asked in.
  const byUser = new Map();
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id).push(r);
  }
  const sessions = [];
  for (const [, userRows] of byUser) {
    let current = null;
    for (const r of userRows) {
      const t = Date.parse(r.created_at);
      if (!current || t - current.last > SESSION_GAP_MS) {
        current = { rows: [], last: t };
        sessions.push(current);
      }
      current.rows.push(r);
      current.last = t;
    }
  }
  sessions.sort((a, b) => a.rows[0].created_at.localeCompare(b.rows[0].created_at));
  console.log(
    `~${sessions.length} sessions (attempts clustered by a ${SESSION_GAP_MS / 60000}-minute gap), ` +
      `${byUser.size} account(s)\n`,
  );

  const header =
    '                        n     credited   empty  override   retry   heard    rms   median  stop reasons';
  console.log('BY APP VERSION');
  console.log(header);
  const byVersion = new Map();
  for (const r of rows) {
    const v = r.app_version ?? 'unknown';
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v).push(r);
  }
  for (const v of [...byVersion.keys()].sort()) printGroup(v, byVersion.get(v));

  console.log('\nBY MODEL');
  console.log(header);
  const byModel = new Map();
  for (const r of rows) {
    const m = (r.model_id ?? 'unknown').replace('sherpa-onnx-nemo-', '').slice(0, 20);
    if (!byModel.has(m)) byModel.set(m, []);
    byModel.get(m).push(r);
  }
  for (const m of [...byModel.keys()].sort()) printGroup(m, byModel.get(m));

  console.log('\nBY DAY');
  console.log(header);
  const byDay = new Map();
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  for (const d of [...byDay.keys()].sort()) printGroup(d, byDay.get(d));

  console.log('\nLAST 12 SESSIONS');
  console.log(header);
  for (const s of sessions.slice(-12)) {
    printGroup(
      `${s.rows[0].created_at.slice(5, 16)} ${(s.rows[0].app_version ?? '?').slice(-3)}`,
      s.rows,
    );
  }

  console.log('\nMOST RECENT 30 ATTEMPTS (oldest→newest)');
  for (const r of rows.slice(-30)) {
    const ok = r.matched ? 'MATCH' : r.resolution === 'accept' ? 'OVERR' : 'miss ';
    console.log(
      `  ${r.created_at.slice(5, 16)}  ${(r.app_version ?? '?').padEnd(12)} ${ok}` +
        `  ${String(r.stop_reason ?? '-').padEnd(11)} rms=${(r.peak_rms ?? 0).toFixed(5)}` +
        `  exp="${(r.expected ?? '').slice(0, 22)}"  got="${(r.transcript ?? '').slice(0, 28)}"`,
    );
  }
  console.log();
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
