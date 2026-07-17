import { Redirect } from 'expo-router';
import type { JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Index screen - redirects to the right root for the current auth state.
 *
 * The target must agree with the <Stack.Protected> guards in _layout.tsx:
 * redirecting into a guarded route the user cannot enter leaves the router
 * parked on `/`, which renders nothing at all.
 */
export default function Index(): JSX.Element {
  const { session } = useAuth();

  return <Redirect href={session ? ROUTE_PATHS.EXPLORE_TAB : ROUTE_PATHS.AUTH} />;
}
