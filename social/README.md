# OpenArabic — daily "word of the day" social poster

Automated, branded vocabulary cards posted **twice daily** to **X**, **Facebook**,
**Instagram feed**, and **Instagram story**. Words come from the live OpenArabic DB (ranked
by real in-article usage); a Claude skill curates + transliterates them; a
systemd timer on the Hetzner box renders and posts.

Ported from the proven `../zuhd.news` posting system (Node + `@resvg/resvg-js`
renderer, hand-signed X OAuth 1.0a, Meta Graph API feed/story).

## Pieces

| Path | What |
|---|---|
| `lib/card.mjs` | SVG→resvg renderer. Dark sage card, `SQUARE` (X + Facebook + IG feed) + `STORY` (IG 9:16). `node lib/card.mjs --sample` to preview. |
| `scripts/fetch-candidates.mjs` | **Read-only** DB scan: ranks `roots` by `sentence_words` usage, excludes queued/posted. |
| `scripts/queue-add.mjs` | Append vetted words to `queue.json` (dedupes by `root_id`). |
| `lib/storage.mjs` | Upload a card to Supabase Storage → public JPEG URL (Instagram needs it). |
| `lib/x.mjs` | Post image + text to X (v1.1 media/upload → v2 tweet). |
| `lib/facebook.mjs` | Post a photo with caption to the Page (Graph API). `scripts/fb-test.mjs` checks it without a public post. |
| `lib/instagram.mjs` | Post feed + first-comment link + story (Graph API). |
| `lib/caption.mjs` | Branded per-word copy + hashtags + word-page link. |
| `post.mjs` | Orchestrator: pop queue → render → upload → post to each channel → record. |
| `run-post.sh` | Thin wrapper (lock + env) the timer calls. |
| `queue.json` / `posted-log.json` | The FIFO the scheduler consumes / the posted ledger. Committed. |
| `deploy/` | systemd unit + timer + `install-hetzner.sh`. |

## Curating words (run locally)

Ask Claude to run the **`openarabic-word-picker`** skill (or `/openarabic-word-picker`).
It pulls the most-used words, validates learner-suitability in a second pass,
writes transliterations, and appends to `queue.json`. Commit + push when done so
the Hetzner checkout picks them up (`git pull`). Keep the queue ≥ ~8 words.

## Posting (manual)

```bash
cp .env.example .env   # fill in creds (see below)
bash run-post.sh --dry-run     # render + preview, no post
node post.mjs --dry-run --word 5266   # preview a specific queued word
bash run-post.sh               # post the next queued word for real
```

## Credentials (`.env`)

- **Supabase** — `SUPABASE_URL` + `SUPABASE_ANON_KEY` (public; reads + Storage
  upload). Optional `SUPABASE_SERVICE_ROLE_KEY` only if anon can't upload.
- **Instagram** — `IG_USER_ID` (IG business account id) + `IG_ACCESS_TOKEN`
  (long-lived / system-user, scopes `instagram_basic` + `instagram_content_publish`).
- **Facebook** — `FB_PAGE_ID` + `FB_ACCESS_TOKEN` (non-expiring Page token, scope
  `pages_manage_posts`, separate from the Instagram token, which lacks that scope).
  Mint it in Graph API Explorer: add the scope, tick the Page, extend the user
  token, then take the Page's token from `/me/accounts`.
- **X** — `X_API_KEY/SECRET` + `X_ACCESS_TOKEN/SECRET` (app must be Read+Write).
  ⚠️ Attaching an image (`media/upload`) may require X's paid **Basic** tier.

Each channel is independent + non-fatal: a missing/failed channel is skipped and
the word stays queued unless at least one channel posted.

## Deploy on Hetzner

```bash
# on the box, alongside your other checkouts
git clone <repo> ~/repos/open-arabic && cd ~/repos/open-arabic/social
cp .env.example .env && $EDITOR .env
bash deploy/install-hetzner.sh      # npm ci + user systemd timer (08:00 & 17:00 UTC)
systemctl --user start openarabic-word.service   # one live post now
journalctl --user -u openarabic-word.service -n 50 --no-pager
```

## Rules

- **Read-only DB.** Only SELECTs against `roots` / `sentence_words`. Polished
  glosses + transliterations live only in `queue.json`, never written back.
- Storage upload is to the public `batch_scheduled` bucket (same as `publish/`).
