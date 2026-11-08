# Cloudflare Workers Deployment Guide

✅ **WORKING**: This Next.js app is successfully deployed to Cloudflare Workers using OpenNext!

**Live URL**: https://openarabic.io

## Quick Start

Deploy to Cloudflare Workers:
```bash
pnpm cf:deploy
```

## Configuration

This app uses **@opennextjs/cloudflare** (v1.12.0+) for Cloudflare Workers deployment.

### Key Files

- `wrangler.jsonc` - Cloudflare Workers configuration
- `open-next.config.ts` - OpenNext adapter configuration
- `.dev.vars` - Local development environment variables
- `public/_headers` - Static asset caching rules

### Requirements

- Node.js 20.x or higher
- pnpm package manager
- Wrangler CLI 4.x (installed as dev dependency)
- @opennextjs/cloudflare 1.12.0+

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

This installs `@opennextjs/cloudflare` and `wrangler@4.x`.

### 2. Configure Wrangler

The `wrangler.jsonc` is already configured with:
- Project name: `openarabic-web`
- Node.js compatibility flags
- Asset serving from `.open-next/assets`
- Worker self-reference binding

### 3. Build and Deploy

```bash
# Build and deploy in one command
pnpm cf:deploy

# Or run separately
pnpm build                        # Build Next.js
opennextjs-cloudflare build      # Generate Cloudflare bundle
opennextjs-cloudflare deploy     # Deploy to Workers

# Preview locally
pnpm preview                     # Test with Wrangler dev server
```

### 4. Environment Variables

Set these in Cloudflare dashboard (Workers → Settings → Variables):

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
- `OPENROUTER_API_KEY` - Your OpenRouter API key (for AI features)

**For local development**, create `.dev.vars`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
NEXTJS_ENV=development
```

## What's Configured

✅ **OpenNext Adapter**: Using `@opennextjs/cloudflare` v1.12.0+ (recommended by Cloudflare)
✅ **All API Routes**: Compatible with Cloudflare Workers (Node.js runtime)
✅ **Images**: Set `unoptimized: true` (required for Cloudflare Workers)
✅ **Build Scripts**: `cf:deploy`, `preview` configured
✅ **Wrangler 4.x**: Latest CLI with full Next.js 15 support
✅ **Static Assets**: Cached with `public/_headers` configuration
✅ **Middleware**: Fully supported with Node.js compatibility flags
✅ **Dynamic Page Titles**: SEO-optimized titles for all routes (homepage, articles, admin)

## Technical Details

### Runtime
- **Node.js runtime** (NOT Edge runtime) - provides full feature support
- Cloudflare Workers with `nodejs_compat` compatibility flag
- Next.js 15.5.6 fully supported

### Cache Strategy
- **Default cache** (no R2 required for basic deployment)
- Static assets cached at CDN edge (31536000s / 1 year)
- For advanced caching with R2, enable R2 in Cloudflare dashboard and update `open-next.config.ts`

### Images
- Served unoptimized (Next.js Image Optimization not available on Workers)
- Remote images from Supabase storage work correctly
- Consider Cloudflare Images for advanced optimization

### Build Output
- Worker bundle: `.open-next/worker.js`
- Static assets: `.open-next/assets/`
- Middleware: Bundled automatically
- Total size: ~6.6 MB / gzipped: ~1.3 MB (well under 10 MB limit)

## Deployment Commands

### Available Scripts

```bash
pnpm dev              # Local development with Next.js
pnpm build            # Build Next.js app
pnpm preview          # Build and preview with Wrangler locally
pnpm deploy           # Build and deploy to Cloudflare
pnpm cf:deploy        # Same as deploy
pnpm cf-typegen       # Generate TypeScript types for Cloudflare env
```

### Wrangler CLI Commands

```bash
# View deployment info
npx wrangler pages deployment list

# View logs
npx wrangler tail openarabic-web

# Delete deployment
npx wrangler delete openarabic-web
```

## Troubleshooting

### Build Errors

**Error: "Unexpected argument 'build'"**
- Update to latest @opennextjs/cloudflare: `pnpm add @opennextjs/cloudflare@latest`
- Ensure wrangler 4.x: `pnpm add -D wrangler@latest`

**TypeScript errors**
- Ensure database types are up to date: Run Supabase type generation
- Check for missing dependencies in useEffect hooks

### Deployment Errors

**Error: "No R2 binding found"**
- Either enable R2 in Cloudflare dashboard and create bucket
- Or remove R2 cache configuration from `open-next.config.ts` (default)

**Error: "Please enable R2"**
- R2 is optional - use default cache strategy for simpler deployment
- R2 only needed for advanced ISR caching

**404 errors on deployed site**
- Check if assets uploaded correctly
- Verify wrangler.jsonc `main` points to `.open-next/worker.js`
- Ensure compatibility flags include `nodejs_compat`

### Environment Variables

**Variables not loading**
- Set in Cloudflare dashboard (not just .env.local)
- Re-deploy after adding variables
- Use `NEXT_PUBLIC_` prefix for client-side variables

## Migration from @cloudflare/next-on-pages

If migrating from the deprecated `@cloudflare/next-on-pages`:

1. Uninstall old package: `pnpm remove @cloudflare/next-on-pages`
2. Install OpenNext: `pnpm add @opennextjs/cloudflare@latest`
3. Update wrangler: `pnpm add -D wrangler@latest`
4. Remove `export const runtime = 'edge'` from API routes (if present)
5. Update deployment scripts in package.json
6. Add `wrangler.jsonc` and `open-next.config.ts`
7. Remove old `.vercel` build output from gitignore

## Supported Features

✅ App Router with Route Handlers
✅ Dynamic routing
✅ SSG and SSR
✅ Middleware
✅ API Routes (all 6 routes working)
✅ Server Components
✅ Static file serving
✅ Image optimization (via Supabase or Cloudflare Images)
✅ Environment variables
✅ Node.js APIs in server code

## Performance

- **Cold start**: ~18ms worker startup time
- **Build time**: ~24 seconds total (Next.js build + OpenNext packaging + deployment)
- **Asset upload**: 52 files / 6.6 MB uncompressed / 1.3 MB gzipped
- **Global edge**: Deployed to Cloudflare's global network

## Support

- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- OpenNext Cloudflare docs: https://opennext.js.org/cloudflare
- Next.js 15 docs: https://nextjs.org/docs

---

**Deployment Status**: ✅ Successfully deployed and serving traffic
**Last Updated**: November 14, 2025
