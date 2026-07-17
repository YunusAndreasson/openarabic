#!/usr/bin/env node
// One-time X (Twitter) 3-legged OAuth 1.0a helper — mints @openarabic access
// tokens using the EXISTING zuhd.news app's consumer keys (the user chose to
// reuse that app). Secrets never pass through the console: consumer keys are
// copied machine-to-machine from ../zuhd.news/.env, and the minted access
// token/secret are written straight into social/.env.
//
// Three sub-commands (run in order):
//   node scripts/x-auth.mjs import-keys   # copy X_API_KEY/X_API_SECRET from zuhd's .env
//   node scripts/x-auth.mjs request       # get a request token, print the authorize URL
//   node scripts/x-auth.mjs access <PIN>  # exchange the PIN for @openarabic tokens
//
// The authorize step must be done in a browser logged into x.com AS @openarabic,
// so the resulting tokens post as @openarabic (not zuhd, not personal).

import { createHmac, randomBytes } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { env } from '../lib/env.mjs'

const SOCIAL_ENV = fileURLToPath(new URL('../.env', import.meta.url))
const ZUHD_ENV = fileURLToPath(new URL('../../../zuhd.news/.env', import.meta.url))
const TMP = fileURLToPath(new URL('../.x-auth-tmp.json', import.meta.url))

const REQUEST_URL = 'https://api.twitter.com/oauth/request_token'
const ACCESS_URL = 'https://api.twitter.com/oauth/access_token'

const rfc3986 = (s) =>
  encodeURIComponent(s).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

const mask = (s) => (s ? `…${String(s).slice(-4)} (${String(s).length} chars)` : '(missing)')

// Parse a KEY=VALUE .env file into a plain object (strips matching quotes).
function parseEnv(path) {
  const out = {}
  if (!existsSync(path)) return out
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[k] = v
  }
  return out
}

// Set keys in social/.env, replacing existing lines and appending new ones.
// Preserves every other line (comments, IG_* creds) verbatim.
function upsertEnv(updates) {
  const lines = existsSync(SOCIAL_ENV) ? readFileSync(SOCIAL_ENV, 'utf8').split(/\r?\n/) : []
  const remaining = { ...updates }
  const next = lines.map((line) => {
    const m = line.match(/^([A-Za-z0-9_]+)=/)
    if (m && m[1] in remaining) {
      const k = m[1]
      const v = remaining[k]
      delete remaining[k]
      return `${k}=${v}`
    }
    return line
  })
  const tail = Object.entries(remaining).map(([k, v]) => `${k}=${v}`)
  let body = next.join('\n')
  if (tail.length) body = body.replace(/\n*$/, '\n') + tail.join('\n') + '\n'
  writeFileSync(SOCIAL_ENV, body)
}

// OAuth 1.0a signature over the oauth_* params only (these endpoints carry no
// extra body params in the base string beyond what we put in `oauth`).
function authHeader(url, oauth, consumerSecret, tokenSecret = '') {
  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(oauth[k])}`)
    .join('&')
  const base = ['POST', rfc3986(url), rfc3986(paramString)].join('&')
  const signingKey = `${rfc3986(consumerSecret)}&${rfc3986(tokenSecret)}`
  const signature = createHmac('sha1', signingKey).update(base).digest('base64')
  return (
    'OAuth ' +
    Object.entries({ ...oauth, oauth_signature: signature })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(v)}"`)
      .join(', ')
  )
}

const baseOauth = (apiKey, extra = {}) => ({
  oauth_consumer_key: apiKey,
  oauth_nonce: randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  oauth_version: '1.0',
  ...extra,
})

function parseFormBody(text) {
  return Object.fromEntries(new URLSearchParams(text))
}

async function importKeys() {
  const zuhd = parseEnv(ZUHD_ENV)
  const apiKey = zuhd.X_API_KEY
  const apiSecret = zuhd.X_API_SECRET
  if (!apiKey || !apiSecret) {
    console.error(`import-keys: X_API_KEY/X_API_SECRET not found in ${ZUHD_ENV}`)
    process.exit(1)
  }
  upsertEnv({ X_API_KEY: apiKey, X_API_SECRET: apiSecret })
  console.log(`import-keys: copied consumer keys into social/.env`)
  console.log(`  X_API_KEY    ${mask(apiKey)}`)
  console.log(`  X_API_SECRET ${mask(apiSecret)}`)
  console.log(`Next: node scripts/x-auth.mjs request`)
}

async function requestToken() {
  const apiKey = env.X_API_KEY
  const apiSecret = env.X_API_SECRET
  if (!apiKey || !apiSecret) {
    console.error('request: X_API_KEY/X_API_SECRET not in social/.env — run `import-keys` first.')
    process.exit(1)
  }
  const oauth = baseOauth(apiKey, { oauth_callback: 'oob' })
  const res = await fetch(REQUEST_URL, {
    method: 'POST',
    headers: { Authorization: authHeader(REQUEST_URL, oauth, apiSecret, '') },
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`request: HTTP ${res.status} — ${text}`)
    console.error(
      'If this is a 403/"callback not approved", the app needs 3-legged OAuth enabled with a callback ' +
        'and Read+Write permission in the X developer console (App → User authentication settings).',
    )
    process.exit(1)
  }
  const p = parseFormBody(text)
  if (!p.oauth_token || p.oauth_callback_confirmed !== 'true') {
    console.error(`request: unexpected response — ${text}`)
    process.exit(1)
  }
  writeFileSync(TMP, JSON.stringify({ oauth_token: p.oauth_token, oauth_token_secret: p.oauth_token_secret }))
  console.log('request: got a request token. Now authorize as @openarabic:')
  console.log(`\n  https://api.twitter.com/oauth/authorize?oauth_token=${p.oauth_token}\n`)
  console.log('Open that URL logged into x.com AS @openarabic, click Authorize, copy the PIN, then:')
  console.log('  node scripts/x-auth.mjs access <PIN>')
}

async function accessToken(pin) {
  if (!pin) {
    console.error('access: missing PIN. Usage: node scripts/x-auth.mjs access <PIN>')
    process.exit(1)
  }
  const apiKey = env.X_API_KEY
  const apiSecret = env.X_API_SECRET
  if (!existsSync(TMP)) {
    console.error('access: no request token on file — run `request` first.')
    process.exit(1)
  }
  const req = JSON.parse(readFileSync(TMP, 'utf8'))
  const oauth = baseOauth(apiKey, { oauth_token: req.oauth_token, oauth_verifier: String(pin).trim() })
  const res = await fetch(ACCESS_URL, {
    method: 'POST',
    headers: { Authorization: authHeader(ACCESS_URL, oauth, apiSecret, req.oauth_token_secret) },
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`access: HTTP ${res.status} — ${text}`)
    process.exit(1)
  }
  const p = parseFormBody(text)
  if (!p.oauth_token || !p.oauth_token_secret) {
    console.error(`access: unexpected response — ${text}`)
    process.exit(1)
  }
  upsertEnv({ X_ACCESS_TOKEN: p.oauth_token, X_ACCESS_SECRET: p.oauth_token_secret })
  try {
    if (existsSync(TMP)) writeFileSync(TMP, '') // clear the temp request token
  } catch {}
  console.log(`access: authorized as @${p.screen_name} (user_id ${p.user_id})`)
  console.log(`  X_ACCESS_TOKEN  ${mask(p.oauth_token)}`)
  console.log(`  X_ACCESS_SECRET ${mask(p.oauth_token_secret)}`)
  if (p.screen_name && p.screen_name.toLowerCase() !== 'openarabic') {
    console.warn(
      `⚠ authorized handle is @${p.screen_name}, not @openarabic — tokens will post there. ` +
        'Re-run `request` and authorize while logged in as @openarabic if this is wrong.',
    )
  }
  console.log('Done. Verify with: node lib/x.mjs --image preview/<card>.jpg --dry-run')
}

const cmd = process.argv[2]
const run = { 'import-keys': importKeys, request: requestToken, access: () => accessToken(process.argv[3]) }[cmd]
if (!run) {
  console.error('Usage: node scripts/x-auth.mjs <import-keys|request|access <PIN>>')
  process.exit(1)
}
run().catch((e) => {
  console.error(`x-auth: ${e.message}`)
  process.exit(1)
})
