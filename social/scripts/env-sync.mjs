#!/usr/bin/env node
// Move a channel's credentials from a local social/.env into a remote one WITHOUT
// the secret values ever printing to the console. Use as a pipeline:
//
//   node scripts/env-sync.mjs emit [x|fb] | ssh hetzner 'cd /root/open-arabic/social && node scripts/env-sync.mjs apply'
//
//   emit  → print that channel's KEY=VALUE lines to stdout (default x). When piped,
//           these are consumed by ssh's stdin and never surface in tool output.
//           NEVER run `emit` un-piped — that would leak the secrets to the terminal.
//   apply → read KEY=VALUE lines from stdin and upsert the known ones into ./.env,
//           replacing existing lines and preserving everything else (IG_* etc.).

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const ENV = fileURLToPath(new URL('../.env', import.meta.url))
const CHANNELS = {
  x: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET'],
  fb: ['FB_PAGE_ID', 'FB_ACCESS_TOKEN'],
}
const ALL_KEYS = Object.values(CHANNELS).flat()

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

function upsertEnv(updates) {
  const lines = existsSync(ENV) ? readFileSync(ENV, 'utf8').split(/\r?\n/) : []
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
  writeFileSync(ENV, body)
}

async function readStdin() {
  let data = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) data += chunk
  return data
}

const cmd = process.argv[2]
if (cmd === 'emit') {
  const env = parseEnv(ENV)
  const KEYS = CHANNELS[process.argv[3] ?? 'x']
  if (!KEYS) {
    console.error(`env-sync emit: unknown channel ${process.argv[3]}`)
    process.exit(1)
  }
  const missing = KEYS.filter((k) => !env[k])
  if (missing.length) {
    console.error(`env-sync emit: missing ${missing.join(', ')} in local .env`)
    process.exit(1)
  }
  process.stdout.write(KEYS.map((k) => `${k}=${env[k]}`).join('\n') + '\n')
} else if (cmd === 'apply') {
  const data = await readStdin()
  const updates = {}
  for (const line of data.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (m && ALL_KEYS.includes(m[1])) updates[m[1]] = m[2]
  }
  const got = Object.keys(updates)
  if (!got.length) {
    console.error('env-sync apply: no known KEY=VALUE lines received on stdin.')
    process.exit(1)
  }
  upsertEnv(updates)
  console.log(`env-sync: upserted ${got.join(', ')} into .env`)
} else if (cmd === 'check') {
  const env = parseEnv(ENV)
  for (const k of ALL_KEYS) {
    const v = env[k]
    console.log(`${k} ${v ? `…${v.slice(-4)} (${v.length} chars)` : '(missing)'}`)
  }
} else {
  console.error('usage: node scripts/env-sync.mjs <emit [x|fb]|apply|check>')
  process.exit(1)
}
