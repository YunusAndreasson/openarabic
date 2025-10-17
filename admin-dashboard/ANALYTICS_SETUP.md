# Analytics Setup Guide

The Analytics dashboard requires a Supabase **Service Role Key** to access user study data, as these tables have Row Level Security (RLS) enabled.

## Steps to Enable Analytics:

### 1. Get Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Find the **`service_role`** key (not the `anon` key)
4. Copy the key

⚠️ **Important**: The service role key has full database access and bypasses all RLS policies. Never expose it to the client or commit it to version control.

### 2. Add the Key to `.env.local`

Open `/admin-dashboard/.env.local` and replace `your-service-role-key-here` with your actual service role key:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://kkmnzbeugdoajtzfjkxg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

### 3. Restart the Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

### 4. View Analytics

Navigate to `http://localhost:3001/admin/analytics` to see:
- **Hard Words Leaderboard** - Most difficult Arabic roots based on FSRS data
- **Content Completeness** - Missing audio files, grammar notes, difficulty levels
- **User Study Analytics** - Active users, mastery stats, due words

## Security Notes

✅ `.env.local` is already in `.gitignore` - your key is safe
✅ `supabaseAdmin` client is server-side only
❌ Never use `supabaseAdmin` in client components
❌ Never commit `.env.local` to git

## Troubleshooting

**Still showing "No Study Data Available"?**
- Check that you added the service role key to `.env.local`
- Verify you restarted the dev server after adding the key
- Check browser console for any error messages
