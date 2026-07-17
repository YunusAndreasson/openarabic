// Upload a rendered card to Supabase Storage and return its public URL.
// Instagram's Graph API requires a publicly reachable JPEG URL, so every card
// is uploaded to a public bucket before posting. Mirrors the upload pattern in
// publish/generate_socialpilot_csv.py (POST to the object endpoint, then read
// from the public endpoint). Prefers the service-role key if present, else the
// anon key (proven sufficient for the batch_scheduled bucket).

import { env } from './env.mjs'

const FOLDER = 'word-of-the-day'

/**
 * @param {Buffer|Uint8Array} buffer — image bytes
 * @param {string} filename — e.g. "knowledge-5266-20260711-square.jpg"
 * @param {string} [contentType='image/jpeg']
 * @returns {Promise<string>} public URL
 */
export async function uploadImage(buffer, filename, contentType = 'image/jpeg') {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
  if (!key) throw new Error('no SUPABASE key (set SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)')
  const bucket = env.SOCIAL_BUCKET
  const path = `${FOLDER}/${filename}`

  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType,
      'x-upsert': 'true', // overwrite on re-run
      'cache-control': 'max-age=3600',
    },
    body: buffer,
  })

  if (!res.ok && res.status !== 409) {
    const body = await res.text().catch(() => '')
    throw new Error(`storage upload ${res.status}: ${body.slice(0, 300)}`)
  }

  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
