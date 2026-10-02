import { Redirect } from 'expo-router';
import type { JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';

/**
 * Any link the router cannot match — a stale or malformed `open-arabic://`
 * URL, or a path renamed since the link was shared — lands where the app
 * itself would open. Without this screen Expo Router shows its developer
 * "Unmatched Route" page, complete with a link to the generated route sitemap.
 *
 * Same targets as app/index.tsx, for the same reason: they must agree with the
 * <Stack.Protected> guards in _layout.tsx.
 */
export default function NotFoundScreen(): JSX.Element {
  const { session } = useAuth();

  return <Redirect href={session ? ROUTE_PATHS.EXPLORE_TAB : ROUTE_PATHS.AUTH} />;
}
