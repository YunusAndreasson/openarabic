# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `admin-dashboard/`.

## Overview

Next.js admin panel for OpenArabic. It still carries the public pages of the old
website; openarabic.io is now its own repository (YunusAndreasson/openarabic.io).
**Not deployed:** its Worker, `openarabic-web`, was deleted on 2026-11-08, so a
deploy creates a new one. Deploy only when the owner asks. Config in
`wrangler.jsonc`; OpenNext (`@opennextjs/cloudflare`) builds it.

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
`opennextjs-cloudflare deploy`, which pushes the `openarabic-web` Worker (deleted on 2026-11-08; a deploy
recreates it).
Requires wrangler auth (`wrangler login`). Mobile app releases are separate —
see `../.claude/docs/deployment.md` (EAS/GitHub Actions).
