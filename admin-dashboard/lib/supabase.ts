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
//
// Throws instead of falling back to the anon key: content tables refuse anon
// writes, so a fallback would only turn a missing key into confusing failures.
// A function rather than a constant because this module is also imported by the
// browser bundle, where the key is never defined; a throw at import would take
// down every page. Anything calling this must check the caller's role first:
// the admin gate in middleware.ts lets through any signed-in user.
export function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set (server-side only)');
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
