#!/usr/bin/env node
// Fetch candidate "word of the day" entries from the OpenArabic DB, ranked by
// real in-article usage — the same signal the public /dictionary hub uses
// (admin-dashboard/lib/word-pages.ts: count sentence_words per root_id, then
// join back to roots). READ-ONLY: only SELECTs against roots + sentence_words.
//
// Excludes any root_id already in queue.json or posted-log.json, applies a
// minimum-usage floor, and prints the top-N as JSON for the word-picker skill
// to validate + transliterate.
//
// Usage:
//   node scripts/fetch-candidates.mjs [--limit 60] [--min 3] [--refresh]
//
// The per-root usage tally is expensive (pages through all sentence_words), so
// it is cached to social/.usage-cache.json and reused for 7 days unless
// --refresh is passed.

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { env, slugifyText } from '../lib/env.mjs'
import { usedRootIds } from '../lib/queue.mjs'

const CACHE_PATH = fileURLToPath(new URL('../.usage-cache.json', import.meta.url))
const PAGE = 1000 // PostgREST row cap
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const argNum = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 ? Number(process.argv[i + 1]) : def
}
const hasFlag = (name) => process.argv.includes(`--${name}`)

const LIMIT = argNum('limit', 60)
const MIN_USAGE = argNum('min', 3)
const REFRESH = hasFlag('refresh')

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const log = (...a) => console.error(...a) // progress → stderr; data → stdout

/** Tally per-root usage across every sentence_words row (client-side count). */
async function scanRootUsage() {
  if (!REFRESH && existsSync(CACHE_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
      if (cached.at && Date.now() - cached.at < CACHE_TTL_MS && cached.usage) {
        log(`using cached usage map (${Object.keys(cached.usage).length} roots, ${Math.round((Date.now() - cached.at) / 86400000)}d old)`)
        return new Map(Object.entries(cached.usage).map(([k, v]) => [Number(k), v]))
      }
    } catch {
      /* fall through to rescan */
    }
  }

  const { count, error } = await supabase.from('sentence_words').select('id', { count: 'exact', head: true })
  if (error) throw new Error(`count sentence_words: ${error.message}`)
  const pages = Math.ceil((count || 0) / PAGE)
  log(`scanning ${count} sentence_words across ${pages} pages…`)

  const usage = new Map()
  // Fetch in parallel batches to keep it fast without hammering the API.
  const BATCH = 8
  for (let start = 0; start < pages; start += BATCH) {
    const group = Array.from({ length: Math.min(BATCH, pages - start) }, (_, k) => {
      const p = start + k
      return supabase
        .from('sentence_words')
        .select('root_id')
        .not('root_id', 'is', null)
        .range(p * PAGE, p * PAGE + PAGE - 1)
    })
    const results = await Promise.all(group)
    for (const { data, error: e } of results) {
      if (e) throw new Error(`scan page: ${e.message}`)
      for (const row of data || []) usage.set(row.root_id, (usage.get(row.root_id) || 0) + 1)
    }
    log(`  …${Math.min(start + BATCH, pages)}/${pages} pages`)
  }

  writeFileSync(CACHE_PATH, JSON.stringify({ at: Date.now(), usage: Object.fromEntries(usage) }))
  return usage
}

async function main() {
  const usage = await scanRootUsage()
  const excluded = usedRootIds()
  log(`excluding ${excluded.size} already queued/posted root ids`)

  const ranked = [...usage.entries()]
    .filter(([id, n]) => n >= MIN_USAGE && !excluded.has(id))
    .sort((a, b) => b[1] - a[1])

  // Take a generous over-fetch (roots may lack letters/meaning), then trim.
  const ids = ranked.slice(0, LIMIT * 2).map(([id]) => id)
  const usageById = new Map(ranked)

  const rootById = new Map()
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150)
    const { data, error } = await supabase.from('roots').select('id, letters, meaning').in('id', chunk)
    if (error) throw new Error(`load roots: ${error.message}`)
    for (const r of data || []) rootById.set(r.id, r)
  }

  const candidates = ids
    .map((id) => rootById.get(id))
    .filter((r) => r && r.letters?.trim() && r.meaning?.trim())
    .slice(0, LIMIT)
    .map((r) => ({
      root_id: r.id,
      letters: r.letters.trim(),
      meaning: r.meaning.trim(),
      usageCount: usageById.get(r.id) || 0,
      slug: `${slugifyText(r.meaning) || 'word'}-${r.id}`,
    }))

  log(`→ ${candidates.length} candidates (min usage ${MIN_USAGE})`)
  process.stdout.write(JSON.stringify(candidates, null, 2) + '\n')
}

main().catch((e) => {
  console.error(`fetch-candidates: ${e.message}`)
  process.exit(1)
})
