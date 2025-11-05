import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

/**
 * Wait for a specific auth state change event
 *
 * This utility helps avoid race conditions when navigating after OAuth sign-in.
 * It waits for the Supabase onAuthStateChange listener to fire with a SIGNED_IN
 * event before resolving, ensuring the session state is fully updated.
 *
 * @param expectedEvent - The auth event to wait for (default: 'SIGNED_IN')
 * @param timeoutMs - Maximum time to wait before rejecting (default: 5000ms)
 * @returns Promise that resolves with the new session when the event fires
 *
 * @example
 * ```ts
 * // After OAuth sign-in
 * await supabase.auth.signInWithIdToken({...});
 *
 * // Wait for session to be fully established
 * await waitForAuthEvent('SIGNED_IN');
 *
 * // Now safe to navigate
 * router.replace(ROUTE_PATHS.EXPLORE_TAB);
 * ```
 */
export function waitForAuthEvent(
  expectedEvent: AuthChangeEvent = 'SIGNED_IN',
  timeoutMs: number = 5000,
): Promise<Session> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      subscription.unsubscribe();
      reject(new Error(`Timeout waiting for ${expectedEvent} event after ${timeoutMs}ms`));
    }, timeoutMs);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === expectedEvent && session) {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
        resolve(session);
      }
    });
  });
}
