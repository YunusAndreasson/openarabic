#!/usr/bin/env node
// Append vetted word entries to social/queue.json. Reads a JSON array from a
// file argument or stdin. Dedupes against everything already queued or posted
// (by root_id), stamps added_at, and validates required fields.
//
// Usage:
//   node scripts/queue-add.mjs vetted.json
//   node scripts/queue-add.mjs < vetted.json
//
// Each input entry must have: root_id, arabic, translit, english, slug.
// usageCount is optional (carried through if present).

import { readFileSync } from 'fs'
import { readQueue, writeQueue, usedRootIds } from '../lib/queue.mjs'

const REQUIRED = ['root_id', 'arabic', 'translit', 'english', 'slug']

function readInput() {
  const fileArg = process.argv[2]
  const raw = fileArg ? readFileSync(fileArg, 'utf8') : readFileSync(0, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('input must be a JSON array')
  return parsed
}

const entries = readInput()
const used = usedRootIds()
const queue = readQueue()
const now = new Date().toISOString()

let added = 0
const skipped = []
for (const e of entries) {
  const missing = REQUIRED.filter((k) => e[k] === undefined || e[k] === null || e[k] === '')
  if (missing.length) {
    skipped.push(`${e.root_id ?? '?'} (missing ${missing.join(', ')})`)
    continue
  }
  if (used.has(e.root_id)) {
    skipped.push(`${e.root_id} (${e.english}) — already queued/posted`)
    continue
  }
  used.add(e.root_id)
  queue.push({
    root_id: e.root_id,
    arabic: String(e.arabic).trim(),
    translit: String(e.translit).trim(),
    english: String(e.english).trim(),
    slug: String(e.slug).trim(),
    usageCount: e.usageCount ?? null,
    added_at: now,
  })
  added++
}

writeQueue(queue)
console.log(`queue-add: +${added} added, ${skipped.length} skipped. queue now ${queue.length}.`)
for (const s of skipped) console.log(`  skip: ${s}`)
