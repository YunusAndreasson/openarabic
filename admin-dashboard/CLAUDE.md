# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in `admin-dashboard/`.

## Overview

Next.js admin panel for OpenArabic. It still carries the public pages of the old
website; openarabic.io is now its own repository (YunusAndreasson/openarabic.io).
**Retired, not deployed:** its Worker, `openarabic-web`, was deleted on 2026-11-08.
Config in `wrangler.jsonc`; OpenNext (`@opennextjs/cloudflare`) builds it.

## Commands

```bash
pnpm dev          # next dev --turbo
pnpm build        # next build
pnpm test         # vitest run
pnpm lint         # eslint
pnpm verify       # lint + test + build (full check — run before finishing)
pnpm preview      # opennextjs-cloudflare build + local preview
```

## Deploy

**Retired. Never deploy.** The `openarabic-web` Worker this dashboard deployed to was deleted on
2026-11-08; `pnpm deploy` recreated it by accident on 2026-11-15, so the `deploy` and `cf:deploy`
scripts were removed on 2026-11-19. Don't add them back. openarabic.io
is served by the separate `~/Work/openarabic-web` repo. Mobile app releases: see
`../.claude/docs/deployment.md`.
