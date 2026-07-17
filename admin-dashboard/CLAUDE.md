# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `admin-dashboard/`.

## Overview

Next.js admin panel + public web pages for OpenArabic (openarabic.io), deployed
as the **`openarabic-web` Cloudflare Worker** via OpenNext
(`@opennextjs/cloudflare`). Config in `wrangler.jsonc`.

## Commands

```bash
pnpm dev          # next dev --turbo
pnpm build        # next build
pnpm test         # vitest run
pnpm lint         # eslint
pnpm verify       # lint + test + build (full check — run before finishing)
pnpm preview      # opennextjs-cloudflare build + local preview
pnpm deploy       # opennextjs-cloudflare build + deploy (see Deploy)
```

## Deploy

`pnpm deploy` (alias `pnpm cf:deploy`) runs `opennextjs-cloudflare build`
(Next.js build + OpenNext transform into `.open-next/`) followed by
`opennextjs-cloudflare deploy`, which pushes the `openarabic-web` Worker.
Requires wrangler auth (`wrangler login`). Mobile app releases are separate —
see `../.claude/docs/deployment.md` (EAS/GitHub Actions).
