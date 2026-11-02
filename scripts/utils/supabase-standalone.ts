/**
 * Standalone Supabase client for Node.js scripts
 * No React Native dependencies - safe for server-side use
 */
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../constants/supabase';
import type { Database } from '../../types/database.types';

/**
 * Create a standalone Supabase client for scripts
 * Uses same credentials as the app but without React Native storage
 *
 * Read-only scripts work with the anon key. Scripts that write need
 * SUPABASE_SERVICE_ROLE_KEY in the environment: content tables refuse anon writes,
 * and without it the write fails with a permission error.
 */
export const supabaseClient = createClient<Database>(
  SUPABASE_URL,
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // No session persistence in scripts
      autoRefreshToken: false, // No auto-refresh needed
      detectSessionInUrl: false,
    },
  },
);

/**
 * Helper to execute a query with error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
): Promise<T> {
  const { data, error } = await queryFn();

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from query');
  }

  return data;
}
