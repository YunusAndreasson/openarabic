// Post to Instagram via the Meta Graph API (container → poll → publish).
// Ported from ../zuhd.news/scripts/post-to-instagram.js.
//   Feed:  image_url + caption (no media_type)
//   Comment: the hashtag block (kept out of the caption; URLs aren't tappable here)
//   Story: media_type=STORIES, no caption, 9:16 image
// Plain fetch, no SDK. Each sub-step is independently try/caught by the caller.

import { env } from './env.mjs'

const GRAPH = 'https://graph.facebook.com/v21.0'
const MAX_CAPTION = 2000 // IG hard limit 2200; leave headroom.

export const igCreds = () => ({ userId: env.IG_USER_ID, token: env.IG_ACCESS_TOKEN })
export const haveIgCreds = () => Boolean(env.IG_USER_ID && env.IG_ACCESS_TOKEN)

async function graphPost(path, params, token) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token }).toString(),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.error) throw new Error(json?.error?.message || `HTTP ${res.status}`)
  return json
}

async function waitForContainer(creationId, token) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`)
    const json = await res.json().catch(() => ({}))
    if (json?.status_code === 'FINISHED') return
    if (json?.status_code === 'ERROR') throw new Error('container processing failed')
    await new Promise((r) => setTimeout(r, 1500))
  }
}

async function publishImage({ imageUrl, mediaType, extra = {} }, creds) {
  const container = await graphPost(
    `${creds.userId}/media`,
    { image_url: imageUrl, ...(mediaType ? { media_type: mediaType } : {}), ...extra },
    creds.token,
  )
  await waitForContainer(container.id, creds.token)
  const published = await graphPost(`${creds.userId}/media_publish`, { creation_id: container.id }, creds.token)
  return published.id
}

/**
 * Post feed + first-comment + story. Feed and story are independent; a story
 * failure never fails the feed post.
 * @param {{feedUrl:string, storyUrl:string, caption:string, firstComment:string, dryRun?:boolean}} opts
 * @returns {Promise<{ok:boolean, mediaId?:string, commentId?:string, storyMediaId?:string, error?:string, skipped?:boolean}>}
 */
export async function postToInstagram({ feedUrl, storyUrl, caption, firstComment, dryRun = false }) {
  const creds = igCreds()
  const trimmedCaption = String(caption || '').slice(0, MAX_CAPTION)

  if (!haveIgCreds()) {
    console.log('post-to-instagram: IG_USER_ID / IG_ACCESS_TOKEN not set — skipping.')
    return { ok: false, skipped: true }
  }
  if (dryRun) {
    console.log(`[dry-run] IG feed → ${feedUrl}`)
    console.log(`[dry-run] IG story → ${storyUrl}`)
    console.log(`[dry-run] IG first comment → ${firstComment}`)
    console.log(`[dry-run] IG caption:\n${trimmedCaption}`)
    return { ok: false, skipped: true }
  }

  // 1. Feed (caption rides on the container).
  const mediaId = await publishImage({ imageUrl: feedUrl, extra: { caption: trimmedCaption } }, creds)
  console.log(`post-to-instagram: posted feed ${mediaId}`)

  // 2. First comment: the hashtag block (keeps the caption clean).
  let commentId = null
  try {
    const c = await graphPost(`${mediaId}/comments`, { message: firstComment }, creds.token)
    commentId = c.id
  } catch (e) {
    console.error(`post-to-instagram: first-comment failed (non-fatal) — ${e.message}`)
  }

  // 3. Story cross-post (independent of the feed post).
  let storyMediaId = null
  try {
    storyMediaId = await publishImage({ imageUrl: storyUrl, mediaType: 'STORIES' }, creds)
    console.log(`post-to-instagram: posted story ${storyMediaId}`)
  } catch (e) {
    console.error(`post-to-instagram: story cross-post failed (non-fatal) — ${e.message}`)
  }

  return { ok: true, mediaId, commentId, storyMediaId }
}

// --- CLI for isolated cred testing:
// node lib/instagram.mjs --feed <url> --story <url> --caption "..." --comment "#tags" [--dry-run]
if (process.argv[1] && (await import('url')).fileURLToPath(import.meta.url) === process.argv[1]) {
  const argAt = (n) => {
    const i = process.argv.indexOf(`--${n}`)
    return i !== -1 ? process.argv[i + 1] : undefined
  }
  postToInstagram({
    feedUrl: argAt('feed'),
    storyUrl: argAt('story'),
    caption: argAt('caption') || 'OpenArabic test',
    firstComment: argAt('comment') || '#Arabic',
    dryRun: process.argv.includes('--dry-run'),
  })
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.error(`post-to-instagram: ${e.message}`)
      process.exit(1)
    })
}
