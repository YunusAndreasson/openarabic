// Post a photo to the OpenArabic Facebook Page via the Graph API.
// Uploads the JPEG bytes directly (no public URL needed), as X does.
// The token must be a Page token with pages_manage_posts: the Instagram one lacks
// that scope, so Facebook has its own credentials.

import { env } from './env.mjs'
import { GRAPH } from './instagram.mjs'

export const fbCreds = () => ({ pageId: env.FB_PAGE_ID, token: env.FB_ACCESS_TOKEN })
export const haveFbCreds = () => Boolean(env.FB_PAGE_ID && env.FB_ACCESS_TOKEN)

/**
 * Post the square card to the Page.
 * @param {{imageBuffer:Buffer, caption:string, published?:boolean, dryRun?:boolean}} opts
 *   published:false uploads a photo no follower can see, for checking credentials.
 * @returns {Promise<{ok:boolean, id?:string, postId?:string, skipped?:boolean}>}
 */
export async function postToFacebook({ imageBuffer, caption, published = true, dryRun = false }) {
  if (!haveFbCreds()) {
    console.log('post-to-facebook: FB_PAGE_ID / FB_ACCESS_TOKEN not set — skipping.')
    return { ok: false, skipped: true }
  }
  if (dryRun) {
    console.log(`[dry-run] Facebook photo: ${imageBuffer.length} bytes, caption:\n${caption}`)
    return { ok: false, skipped: true }
  }

  const { pageId, token } = fbCreds()
  const form = new FormData()
  form.append('source', new Blob([imageBuffer], { type: 'image/jpeg' }), 'card.jpg')
  form.append('caption', caption)
  form.append('published', String(published))
  form.append('access_token', token)

  const res = await fetch(`${GRAPH}/${pageId}/photos`, { method: 'POST', body: form })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.error) throw new Error(json?.error?.message || `HTTP ${res.status}`)

  if (published) console.log(`post-to-facebook: posted https://www.facebook.com/${json.post_id || json.id}`)
  return { ok: true, id: json.id, postId: json.post_id }
}
