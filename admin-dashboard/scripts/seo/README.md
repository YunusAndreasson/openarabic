# SEO data pipeline — openarabic.io

Read-only fetchers that pull **Google Search Console** (and optionally **GA4**)
data so SEO decisions are driven by real numbers. Fully decoupled from the Next
app / Cloudflare worker — these are local ops scripts.

## Why a service account?

The shared gcloud user-OAuth client is **blocked** from Google's sensitive
`webmasters` scope ("This app is blocked"). A service account authenticates via
IAM with no consent screen, so it's the only programmatic path that works here.

## One-time setup (mostly done)

| Step | Status |
|------|--------|
| Enable `searchconsole.googleapis.com` + `analyticsdata.googleapis.com` | ✅ done |
| Create SA `seo-reporter@openarabic.iam.gserviceaccount.com` + key | ✅ done (`~/.config/openarabic/gsc-sa.json`) |
| Create venv + install deps | ✅ done (`.venv/`) |
| **Add the SA as a GSC user (Full)** | ⬜ **manual — required** |
| Add the SA as a GA4 Viewer (optional, for `fetch_ga4.py`) | ⬜ manual |

### Manual step — grant the SA access (you, ~1 min each)

**Search Console (required):**
1. https://search.google.com/search-console → property `https://openarabic.io`
2. Settings → **Users and permissions** → **Add user**
3. Email: `seo-reporter@openarabic.iam.gserviceaccount.com` — Permission: **Full**

**GA4 (optional):** GA4 → Admin → **Property Access Management** → add the same
email as **Viewer**. Property id: `263660391`.

## Run

```bash
cd admin-dashboard/scripts/seo
.venv/bin/python fetch_gsc.py --days 28      # Search Console
.venv/bin/python fetch_ga4.py --days 28      # GA4 (optional)
```

Outputs go to `data/` (gitignored): one CSV per dimension + a combined JSON
snapshot, timestamped. The scripts also print the top rows.

**Expected today:** `fetch_gsc.py` succeeds but returns **0 rows** — GSC was
verified 2026-06-19 and needs ~3–14 days to populate. That's success: it proves
auth + the pipeline. Re-run weekly from **~2026-07-03**.

## What to do with the data (analysis cadence)

Weekly, look at `gsc_query_*`, `gsc_page_*`, `gsc_query_page_*` and apply:

- **Striking distance** — `query_page` rows at position **5–20** with rising
  impressions but low CTR → optimize that page's title / H1 / body / internal links.
- **Low-CTR winners** — high impressions, CTR below the curve for their position
  → rewrite `<title>` + meta description only.
- **Indexation** — GSC *Pages* report (UI): crawled-not-indexed / discovered-not-indexed
  / duplicate-canonical → fix thin content & canonicals.
- **Query↔content gaps** — a topic with impressions but no dedicated page → build
  the matching landing page (author / category / guide). See the plan's Part 3.
- **Rising pages** — reinforce with internal links + related content.

## Files

- `fetch_gsc.py` — Search Console search-analytics → CSV/JSON (`webmasters.readonly`)
- `fetch_ga4.py` — GA4 landing-page metrics → CSV/JSON (`analytics.readonly`, optional)
- `data/` — fetched snapshots (gitignored)
- `.venv/` — local Python env (gitignored)

Key lives at `~/.config/openarabic/gsc-sa.json` (outside the repo, `chmod 600`).
Override with `GSC_SA_KEY`, site with `GSC_SITE_URL`, GA4 property with `GA4_PROPERTY_ID`.
