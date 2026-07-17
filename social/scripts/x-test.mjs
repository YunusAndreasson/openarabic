#!/usr/bin/env node
// Isolated X-only live test: render the queue-head card and post it (image-only)
// to X. Does NOT touch Instagram and does NOT pop the queue — safe for a one-off
// verification, locally or on the Hetzner box.
//
//   node scripts/x-test.mjs             # real X post (image-only)
//   node scripts/x-test.mjs --dry-run   # render + exercise signing, post nothing
//   node scripts/x-test.mjs --word 5268 # test a specific queued word by root_id

import { readQueue } from '../lib/queue.mjs'
import { renderCardJpeg, SQUARE } from '../lib/card.mjs'
import { postToX } from '../lib/x.mjs'

const hasFlag = (n) => process.argv.includes(`--${n}`)
const argAt = (n) => {
  const i = process.argv.indexOf(`--${n}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}
const dryRun = hasFlag('dry-run')
const wordId = argAt('word') ? Number(argAt('word')) : null

const queue = readQueue()
if (!queue.length) {
  console.error('x-test: queue is empty — nothing to render.')
  process.exit(1)
}
const entry = wordId != null ? queue.find((e) => e.root_id === wordId) : queue[0]
if (!entry) {
  console.error(`x-test: word ${wordId} not found in queue.`)
  process.exit(1)
}

console.log(`x-test: ${entry.arabic} · ${entry.translit} · ${entry.english} (root ${entry.root_id})`)
const jpeg = renderCardJpeg(entry, SQUARE)
const res = await postToX({ imageBuffer: jpeg, text: '', dryRun })
console.log(`x-test result: ${JSON.stringify(res)}`)
if (res.ok) console.log(`x-test: LIVE → https://x.com/OpenArabicIo/status/${res.id}`)
