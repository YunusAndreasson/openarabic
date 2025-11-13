# Cloudflare Pages Deployment Guide

This Next.js application is configured for deployment on Cloudflare Pages.

## Prerequisites

1. Install Wrangler CLI (Cloudflare's command-line tool):
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

## Deployment Methods

### Method 1: Automatic GitHub Integration (Recommended)

1. Push your code to GitHub
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages
3. Click "Create application" → "Pages" → "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Build command**: `npm run pages:build`
   - **Build output directory**: `.vercel/output/static`
   - **Root directory**: `/` (or `/admin-dashboard` if in monorepo)

6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Any other required env vars

7. Click "Save and Deploy"

### Method 2: CLI Deployment

1. Build the project:
   ```bash
   npm run pages:build
   ```

2. Deploy to Cloudflare Pages:
   ```bash
   npm run pages:deploy
   ```

3. Follow the prompts to create a new project or update an existing one

### Method 3: Preview Locally

Test the Cloudflare Pages build locally:
```bash
npm run pages:preview
```

## Configuration Changes Made for Cloudflare

✅ **API Routes**: Added `export const runtime = 'edge'` to all API routes
✅ **Images**: Conditional image optimization (disabled only on Cloudflare, enabled locally)
✅ **Build Scripts**: Added Cloudflare-specific build commands
✅ **Wrangler Config**: Created wrangler.toml for CLI deployments

**Note**: Images are optimized during local development but unoptimized on Cloudflare Pages (automatic via `CF_PAGES` env var)

## Environment Variables

Make sure to add these in Cloudflare Pages dashboard:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- Any other environment variables used in your project

## Notes

- Edge Runtime is used for all API routes for compatibility with Cloudflare Workers
- Image optimization is disabled - images are served unoptimized
- All Supabase client calls use fetch API, fully compatible with Edge Runtime
- Authentication uses cookies and standard Web APIs

## Troubleshooting

**Build fails with "Not compatible with edge runtime"**
- Check that all API routes have `export const runtime = 'edge'`
- Ensure no Node.js-specific APIs are used (fs, path in runtime code)

**Images not loading**
- Verify Supabase storage URLs are accessible
- Check CORS settings in Supabase dashboard

**Authentication not working**
- Verify environment variables are set correctly in Cloudflare
- Check that cookies are being set properly (cross-site settings)

## Support

For Cloudflare Pages issues: https://developers.cloudflare.com/pages/
For Next.js on Pages: https://developers.cloudflare.com/pages/framework-guides/nextjs/
