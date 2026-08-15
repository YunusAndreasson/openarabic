#!/usr/bin/env node
/**
 * Read-only ground truth for the Practice screen.
 *
 * Recomputes every number the Practice tab renders straight from `study_words`,
 * using the SAME rules the app applies, so the screen can be checked against the
 * database rather than against itself. SELECT only — this never writes.
 *
 *   node scripts/practice-ground-truth.mjs [email]
 */

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

import { fsrs, generatorParameters } from 'ts-fsrs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const email = process.argv[2] ?? 'argent-qa@openarabic.app';

// Mirrors constants/fsrs.ts OPTIMIZED_FSRS_CONFIG
const FSRS = fsrs(
  generatorParameters({
    request_retention: 0.9,
    maximum_interval: 365,
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: ['1m', '10m'],
    relearning_steps: ['5m', '10m'],
  }),
);

const CRITICAL = 0.7;
const DAY = 24 * 60 * 60 * 1000;

function resolveConfigValue(value) {
  const match = /^\$\{([^}]+)\}$/.exec(value ?? '');
  return match ? process.env[match[1]] : value;
}

async function credentials() {
  const mcp = JSON.parse(await readFile(resolve(projectRoot, '.mcp.json'), 'utf8'));
  const env = mcp.mcpServers?.supabase?.env ?? {};

  let url = resolveConfigValue(env.SUPABASE_URL);
  let key = resolveConfigValue(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url) {
    const constants = await readFile(resolve(projectRoot, 'constants/supabase.ts'), 'utf8');
    url = constants.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)?.[1];
  }

  // Same fallback the QA-account script uses: ask the authenticated Supabase CLI
  // rather than requiring the key in the environment.
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
  if (!response.ok) throw new Error(`${path} → ${response.status} ${await response.text()}`);
  return response.json();
}

async function findUserId(url, key) {
  const body = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).then(r => r.json());
  const user = (body.users ?? []).find(u => u.email === email);
  if (!user) throw new Error(`No auth user for ${email}`);
  return user.id;
}

/** Page through every row — PostgREST truncates an unbounded select at 1000. */
async function allStudyWords(url, key, userId) {
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await rest(
      url,
      key,
      `study_words?user_id=eq.${userId}&select=root_id,created_at,fsrs_due,fsrs_stability,fsrs_difficulty,fsrs_reps,fsrs_lapses,fsrs_state,fsrs_last_review&limit=${PAGE}&offset=${offset}`,
    );
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

// --- the app's own predicates -------------------------------------------------
const hasBeenPractised = w => (w.fsrs_state ?? 0) !== 0 && (w.fsrs_reps ?? 0) > 0;
const isMastered = w => w.fsrs_state === 2 && (w.fsrs_stability ?? 0) >= 5;
const isLeech = w =>
  (w.fsrs_state ?? 0) !== 0 && (w.fsrs_reps ?? 0) > 0 && (w.fsrs_lapses ?? 0) >= 2;

const horizonDays = w => {
  if (!hasBeenPractised(w)) return null;
  const s = w.fsrs_stability;
  return s == null || !Number.isFinite(s) || s <= 0 ? null : s;
};

const band = d => (d >= 365 ? 'year' : d >= 30 ? 'months' : d >= 7 ? 'weeks' : 'days');

function retrievability(word, at) {
  const last = Date.parse(word.fsrs_last_review);
  if (!Number.isFinite(last)) return 0;
  const elapsed = (at - last) / DAY;
  return Math.max(0, Math.min(1, FSRS.forgetting_curve(elapsed, word.fsrs_stability ?? 0)));
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const main = async () => {
  const { url, key } = await credentials();
  const userId = await findUserId(url, key);
  const words = await allStudyWords(url, key, userId);
  const now = Date.now();

  const practised = words.filter(hasBeenPractised).filter(w => w.fsrs_last_review);
  const sumR = practised.reduce((sum, w) => sum + retrievability(w, now), 0);
  const avgR = practised.length ? (sumR / practised.length) * 100 : 0;

  const horizons = words.map(horizonDays).filter(d => d != null);
  const bands = { days: 0, weeks: 0, months: 0, year: 0 };
  horizons.forEach(d => (bands[band(d)] += 1));

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  const weekEnd = now + 6 * DAY;
  const criticalNow = practised.filter(w => retrievability(w, now) < CRITICAL).length;
  const criticalWeek = practised.filter(w => retrievability(w, weekEnd) < CRITICAL).length;

  // `isDueWord`: due in the past, or a brand-new card. NOTE this omits the 2h
  // session cooldown the server applies, so it is an UPPER bound on the CTA's
  // count — and the CTA also clips at 100.
  const dueNow = words.filter(w => {
    if ((w.fsrs_state ?? 0) === 0) return true;
    const due = Date.parse(w.fsrs_due);
    return Number.isFinite(due) && due <= now;
  }).length;

  const out = {
    email,
    userId,
    totalWords: words.length,
    practisedCount: practised.length,
    notStarted: words.length - practised.length,
    recallableNow: Math.min(practised.length, Math.round(sumR)),
    currentRetrievabilityPct: Math.round(avgR),
    medianHorizonDays: median(horizons),
    bands,
    mastered: words.filter(isMastered).length,
    leeches: words.filter(isLeech).length,
    totalReviews: words.reduce((sum, w) => sum + Math.max(0, w.fsrs_reps ?? 0), 0),
    reviewedToday: words.filter(
      w => (w.fsrs_reps ?? 0) > 0 && Date.parse(w.fsrs_last_review) >= midnight.getTime(),
    ).length,
    dueNowUncapped: dueNow,
    criticalNow,
    criticalWeekDelta: criticalWeek - criticalNow,
  };

  console.log(JSON.stringify(out, null, 2));
};

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
