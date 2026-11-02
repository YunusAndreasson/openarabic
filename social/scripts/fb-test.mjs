#!/usr/bin/env node
// Isolated Facebook test: render a queued card and send it to the Page. Touches
// no other channel and does not pop the queue.
//
//   node scripts/fb-test.mjs             # upload unpublished, then delete it: nothing public
//   node scripts/fb-test.mjs --dry-run   # render only, no network
//   node scripts/fb-test.mjs --live      # a real, public post
//   node scripts/fb-test.mjs --word 5268 # use a specific queued word by root_id

import { env } from '../lib/env.mjs'
import { readQueue } from '../lib/queue.mjs'
import { renderCardJpeg, SQUARE } from '../lib/card.mjs'
import { buildFbCaption } from '../lib/caption.mjs'
import { postToFacebook } from '../lib/facebook.mjs'
import { GRAPH } from '../lib/instagram.mjs'

const hasFlag = (n) => process.argv.includes(`--${n}`)
const argAt = (n) => {
  const i = process.argv.indexOf(`--${n}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}
const dryRun = hasFlag('dry-run')
const live = hasFlag('live')
const wordId = argAt('word') ? Number(argAt('word')) : null

const queue = readQueue()
const entry = wordId != null ? queue.find((e) => e.root_id === wordId) : queue[0]
if (!entry) {
  console.error('fb-test: no matching word in the queue.')
  process.exit(1)
}

console.log(`fb-test: ${entry.arabic} · ${entry.translit} · ${entry.english} (root ${entry.root_id})`)
const res = await postToFacebook({
  imageBuffer: renderCardJpeg(entry, SQUARE),
  caption: buildFbCaption(entry),
  published: live,
  dryRun,
})
console.log(`fb-test result: ${JSON.stringify(res)}`)

if (res.ok && !live) {
  const del = await fetch(`${GRAPH}/${res.id}?access_token=${encodeURIComponent(env.FB_ACCESS_TOKEN)}`, {
    method: 'DELETE',
  })
  const json = await del.json().catch(() => ({}))
  console.log(`fb-test: unpublished upload deleted: ${json?.success === true}`)
  if (json?.success !== true) process.exit(1)
}
