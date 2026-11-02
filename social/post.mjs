#!/usr/bin/env node
// OpenArabic "word of the day" — render + post one word to X, Facebook + Instagram
// (feed + first-comment link + story). Pops the next word from queue.json,
// renders the square (X + FB + IG feed) and story (IG) cards, uploads them to
// Supabase Storage for a public URL, posts to every channel (each non-fatal),
// records the result in posted-log.json, and removes the word from the queue.
//
// Usage:
//   node post.mjs                 # post the next queued word (real)
//   node post.mjs --dry-run       # render + preview, no upload/post
//   node post.mjs --word 5266     # post a specific queued word (by root_id)
//   node post.mjs --dry-run --word 5266
//
// Non-fatal by design: any failure logs and exits 0 (so the timer never breaks);
// the word is only removed from the queue once at least one channel succeeds.

import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { env } from './lib/env.mjs'
import { readQueue, writeQueue, readPosted, writePosted } from './lib/queue.mjs'
import { renderCardJpeg, SQUARE, STORY } from './lib/card.mjs'
import { uploadImage } from './lib/storage.mjs'
import { buildXText, buildFbCaption, buildIgCaption, buildIgFirstComment, wordUrl } from './lib/caption.mjs'
import { postToX } from './lib/x.mjs'
import { postToInstagram } from './lib/instagram.mjs'
import { postToFacebook } from './lib/facebook.mjs'

const hasFlag = (n) => process.argv.includes(`--${n}`)
const argAt = (n) => {
  const i = process.argv.indexOf(`--${n}`)
  return i !== -1 ? process.argv[i + 1] : undefined
}
const dryRun = hasFlag('dry-run')
const wordId = argAt('word') ? Number(argAt('word')) : null

const LOW_QUEUE = 8 // warn to re-run the picker skill below this

const ymd = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

async function main() {
  const queue = readQueue()
  if (!queue.length) {
    console.log('post: queue is empty — run the openarabic-word-picker skill to add words.')
    return
  }

  const entry = wordId != null ? queue.find((e) => e.root_id === wordId) : queue[0]
  if (!entry) {
    console.log(`post: word ${wordId} not found in queue.`)
    return
  }

  const date = ymd()
  const xText = buildXText(entry)
  const fbCaption = buildFbCaption(entry)
  const caption = buildIgCaption(entry)
  const firstComment = buildIgFirstComment(entry)
  console.log(`post: ${entry.arabic} · ${entry.translit} · ${entry.english}  (${wordUrl(entry)})`)

  const squareJpeg = renderCardJpeg(entry, SQUARE)
  const storyJpeg = renderCardJpeg(entry, STORY)

  if (dryRun) {
    const outDir = fileURLToPath(new URL('./preview/', import.meta.url))
    mkdirSync(outDir, { recursive: true })
    writeFileSync(`${outDir}${entry.slug}-square.jpg`, squareJpeg)
    writeFileSync(`${outDir}${entry.slug}-story.jpg`, storyJpeg)
    console.log(`[dry-run] cards → ${outDir}${entry.slug}-{square,story}.jpg`)
    await postToX({ imageBuffer: squareJpeg, text: xText, dryRun: true })
    await postToFacebook({ imageBuffer: squareJpeg, caption: fbCaption, dryRun: true })
    await postToInstagram({
      feedUrl: `(would upload) ${entry.slug}-square.jpg`,
      storyUrl: `(would upload) ${entry.slug}-story.jpg`,
      caption,
      firstComment,
      dryRun: true,
    })
    return
  }

  // Upload public JPEGs (Instagram requires a public URL; X uses the bytes).
  let feedUrl, storyUrl
  try {
    feedUrl = await uploadImage(squareJpeg, `${entry.slug}-${date}-square.jpg`)
    storyUrl = await uploadImage(storyJpeg, `${entry.slug}-${date}-story.jpg`)
    console.log(`post: uploaded\n  feed  ${feedUrl}\n  story ${storyUrl}`)
  } catch (e) {
    console.error(`post: storage upload failed — ${e.message}. Leaving word in queue.`)
    return
  }

  let xRes = { ok: false }
  try {
    xRes = await postToX({ imageBuffer: squareJpeg, text: xText })
  } catch (e) {
    console.error(`post: X failed (non-fatal) — ${e.message}`)
    xRes = { ok: false, error: e.message }
  }

  let fbRes = { ok: false }
  try {
    fbRes = await postToFacebook({ imageBuffer: squareJpeg, caption: fbCaption })
  } catch (e) {
    console.error(`post: Facebook failed (non-fatal) — ${e.message}`)
    fbRes = { ok: false, error: e.message }
  }

  let igRes = { ok: false }
  try {
    igRes = await postToInstagram({ feedUrl, storyUrl, caption, firstComment })
  } catch (e) {
    console.error(`post: Instagram failed (non-fatal) — ${e.message}`)
    igRes = { ok: false, error: e.message }
  }

  if (!xRes.ok && !fbRes.ok && !igRes.ok) {
    console.error('post: nothing posted (creds missing or all channels failed) — leaving word in queue.')
    return
  }

  // Success on at least one channel: remove from queue + record.
  const remaining = queue.filter((e) => e.root_id !== entry.root_id)
  writeQueue(remaining)
  const posted = readPosted()
  posted.push({
    timestamp: new Date().toISOString(),
    root_id: entry.root_id,
    arabic: entry.arabic,
    translit: entry.translit,
    english: entry.english,
    slug: entry.slug,
    feedUrl,
    storyUrl,
    x: xRes,
    fb: fbRes,
    ig: igRes,
  })
  writePosted(posted)
  console.log(`post: recorded. queue now ${remaining.length}.`)
  if (remaining.length < LOW_QUEUE) {
    console.warn(`⚠ queue low (${remaining.length}) — run the openarabic-word-picker skill to top it up.`)
  }
}

main().catch((e) => {
  console.error(`post: ${e.message} — non-fatal, exiting 0.`)
  process.exit(0)
})
