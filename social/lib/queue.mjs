// Shared read/write for the vetted word queue and the posted ledger.
//
// queue.json  — FIFO of vetted words the scheduler pops from (index 0 first).
// posted-log.json — append-only ledger of what has been posted (dedup source).
// Both are committed to the repo so the Hetzner checkout and local skill runs
// share one state. Each queue entry:
//   { root_id, arabic, translit, english, slug, usageCount, added_at }

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const QUEUE_PATH = fileURLToPath(new URL('../queue.json', import.meta.url))
const POSTED_PATH = fileURLToPath(new URL('../posted-log.json', import.meta.url))

const readJson = (path, fallback) => {
  try {
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback
  } catch {
    return fallback
  }
}

export const readQueue = () => readJson(QUEUE_PATH, [])
export const readPosted = () => readJson(POSTED_PATH, [])

export const writeQueue = (q) => writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + '\n')
export const writePosted = (log) => writeFileSync(POSTED_PATH, JSON.stringify(log, null, 2) + '\n')

/** Every root_id already queued or posted — the exclusion set for new picks. */
export const usedRootIds = () => {
  const ids = new Set()
  for (const e of readQueue()) if (e?.root_id != null) ids.add(e.root_id)
  for (const e of readPosted()) if (e?.root_id != null) ids.add(e.root_id)
  return ids
}

export { QUEUE_PATH, POSTED_PATH }
