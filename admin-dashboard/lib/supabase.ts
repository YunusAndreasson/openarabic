import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

// For client-side operations (public data only)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// For server-side/admin operations (has full access, bypasses RLS)
// ⚠️ NEVER expose this client to the browser - only use in server components or API routes
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
