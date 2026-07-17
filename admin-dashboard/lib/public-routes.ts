/**
 * The single source of truth for which routes are part of the PUBLIC
 * openarabic.io site (as opposed to the admin dashboard).
 *
 * Used by BOTH:
 *  - `middleware.ts` — to decide which routes skip the auth/login gate, and
 *  - `components/layout-wrapper.tsx` — to decide which routes render WITHOUT the
 *    admin header/container chrome.
 *
 * Keep this list as the only definition. When a new public section is added
 * (e.g. a new landing-page type), add it here once and both the access gate and
 * the chrome update together — they previously drifted, which let new public
 * pages render inside the admin layout / redirect to /login.
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/account-deletion',
  '/privacy',
  '/terms',
  '/contact',
  '/download-app',
  '/dictionary',
];

/** Public route families matched by prefix (each has many dynamic URLs). */
export const PUBLIC_ROUTE_PREFIXES = [
  '/read/',
  '/word/',
  '/author/',
  '/books/',
  '/dictionary/', // A–Z browse pages (/dictionary itself is in PUBLIC_ROUTES)
];

export function isPublicRoute(path: string | null | undefined): boolean {
  if (!path) return false;
  return (
    PUBLIC_ROUTES.includes(path) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}
