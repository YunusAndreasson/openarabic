import { router } from 'expo-router';

import type { Route } from '@/types/navigation.types';

/**
 * Type-safe navigation helper that ensures params match the pathname
 *
 * This wrapper around Expo Router's push function provides compile-time safety
 * by using discriminated unions to ensure the params you pass match the route.
 *
 * @example
 * ```ts
 * // ✅ Correct - params match the route
 * typedPush({ pathname: '/article/[id]', params: { id: '123' } });
 *
 * // ❌ Type error - wrong params for this route
 * typedPush({ pathname: '/article/[id]', params: { rootId: 123 } });
 * ```
 */
export const typedPush = (route: Route): void => {
  router.push({ pathname: route.pathname, params: route.params as Record<string, string> });
};

/**
 * Type-safe navigation replace helper
 * Same as typedPush but replaces current route instead of pushing
 */
export const typedReplace = (route: Route): void => {
  router.replace({ pathname: route.pathname, params: route.params as Record<string, string> });
};
