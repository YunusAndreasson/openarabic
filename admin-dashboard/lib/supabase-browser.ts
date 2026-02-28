import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
