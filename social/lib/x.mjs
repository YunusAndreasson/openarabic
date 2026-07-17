// Post an image (+ optional text) to X (Twitter). Two steps:
//   1. Upload the JPEG via v1.1 media/upload  → media_id
//   2. Create the tweet via v2 /2/tweets with { text, media:{ media_ids } }
//
// Auth is OAuth 1.0a User Context, signed by hand with node:crypto (ported from
// ../zuhd.news/scripts/post-to-twitter.js — which posts text only; we add media).
// Signing note: neither a multipart body (media/upload) nor a JSON body
// (/2/tweets) contributes to the OAuth signature base string, so authHeader
// signs only the oauth_* params in both cases.
//
// NOTE: media/upload access may require X's paid Basic tier; on the Free tier
// the upload call can 403/453. Treated as non-fatal by the orchestrator.

import { createHmac, randomBytes } from 'crypto'
import { env } from './env.mjs'

const UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json'
const TWEET_URL = 'https://api.twitter.com/2/tweets'

export const xCreds = () => ({
  apiKey: env.X_API_KEY,
  apiSecret: env.X_API_SECRET,
  accessToken: env.X_ACCESS_TOKEN,
  accessSecret: env.X_ACCESS_SECRET,
})

export const haveXCreds = () => Object.values(xCreds()).every(Boolean)

const rfc3986 = (str) =>
  encodeURIComponent(str).replace(/[!*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

function authHeader(method, url, creds) {
  const oauth = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  }
  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(oauth[k])}`)
    .join('&')
  const base = [method.toUpperCase(), rfc3986(url), rfc3986(paramString)].join('&')
  const signingKey = `${rfc3986(creds.apiSecret)}&${rfc3986(creds.accessSecret)}`
  const signature = createHmac('sha1', signingKey).update(base).digest('base64')
  return (
    'OAuth ' +
    Object.entries({ ...oauth, oauth_signature: signature })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(v)}"`)
      .join(', ')
  )
}

async function uploadMedia(buffer, creds) {
  const fd = new FormData()
  fd.append('media', new Blob([buffer], { type: 'image/jpeg' }), 'card.jpg')
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: authHeader('POST', UPLOAD_URL, creds) },
    body: fd,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.media_id_string) {
    const err = json?.errors?.[0]?.message || json?.error || `HTTP ${res.status}`
    throw new Error(`media/upload: ${err}`)
  }
  return json.media_id_string
}

async function createTweet(text, mediaIds, creds) {
  const res = await fetch(TWEET_URL, {
    method: 'POST',
    headers: { Authorization: authHeader('POST', TWEET_URL, creds), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(text ? { text } : {}), ...(mediaIds?.length ? { media: { media_ids: mediaIds } } : {}) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.data?.id) {
    const err = json?.detail || json?.title || `HTTP ${res.status}`
    throw new Error(`create tweet: ${err}`)
  }
  return json.data.id
}

/**
 * Post an image + text to X.
 * @param {{imageBuffer:Buffer, text:string, dryRun?:boolean}} opts
 * @returns {Promise<{ok:boolean, id?:string, error?:string, skipped?:boolean}>}
 */
export async function postToX({ imageBuffer, text, dryRun = false }) {
  const creds = xCreds()
  if (!haveXCreds()) {
    if (dryRun) {
      console.log('[dry-run] X creds not set — would skip.')
      return { ok: false, skipped: true }
    }
    console.log('post-to-x: X_* credentials not set — skipping.')
    return { ok: false, skipped: true }
  }
  if (dryRun) {
    // Exercise signing so a broken header surfaces without posting.
    const header = authHeader('POST', TWEET_URL, creds)
    console.log(text ? `[dry-run] X tweet (${text.length} chars):\n${text}` : '[dry-run] X: image-only (no tweet text).')
    console.log(`[dry-run] would upload ${imageBuffer.length} bytes + tweet — auth header OK (${header.length} chars).`)
    return { ok: false, skipped: true }
  }
  const mediaId = await uploadMedia(imageBuffer, creds)
  const id = await createTweet(text, [mediaId], creds)
  console.log(`post-to-x: posted https://x.com/i/status/${id}`)
  return { ok: true, id }
}

// --- CLI: node lib/x.mjs --image path.jpg --text "..." [--dry-run] ---
if (process.argv[1] && (await import('url')).fileURLToPath(import.meta.url) === process.argv[1]) {
  const argAt = (n) => {
    const i = process.argv.indexOf(`--${n}`)
    return i !== -1 ? process.argv[i + 1] : undefined
  }
  const { readFileSync } = await import('fs')
  const imgPath = argAt('image')
  const text = argAt('text') || 'OpenArabic media test'
  const dryRun = process.argv.includes('--dry-run')
  const buf = imgPath ? readFileSync(imgPath) : Buffer.alloc(0)
  postToX({ imageBuffer: buf, text, dryRun })
    .then((r) => console.log(JSON.stringify(r)))
    .catch((e) => {
      console.error(`post-to-x: ${e.message}`)
      process.exit(1)
    })
}
