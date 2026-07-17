// Minimal .env loader (no dependency). Loads social/.env into process.env
// without overriding values already present in the environment, then applies
// safe public defaults so read-only DB access works out of the box.
//
// The Supabase URL + anon key are public (the anon key is already committed in
// publish/generate_socialpilot_csv.py) and only grant the read access the
// public website already uses, plus Storage upload to the batch_scheduled
// bucket. All write-capable secrets (IG/X tokens) have NO default and must be
// provided via social/.env.

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const ENV_PATH = fileURLToPath(new URL('../.env', import.meta.url))

if (existsSync(ENV_PATH)) {
  for (const raw of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

// Public read defaults (project URL + anon key — same as publish/ scripts).
const DEFAULTS = {
  SUPABASE_URL: 'https://kkmnzbeugdoajtzfjkxg.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os',
  SOCIAL_BUCKET: 'batch_scheduled',
  SITE_URL: 'https://openarabic.io',
}
for (const [k, v] of Object.entries(DEFAULTS)) {
  if (!process.env[k]) process.env[k] = v
}

export const env = process.env

/** Lowercase ASCII hyphen slug (mirrors admin-dashboard/lib/slugify.ts). */
export const slugifyText = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Canonical openarabic.io word-page path for a dictionary entry. */
export const wordPagePath = (rootId, meaning) => `/word/${slugifyText(meaning) || 'word'}-${rootId}`
