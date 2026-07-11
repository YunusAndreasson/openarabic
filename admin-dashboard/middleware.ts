import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPublicRoute } from '@/lib/public-routes';
import { storeRedirectUrl } from '@/lib/user-agent';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Smart download link: send a real phone hitting /download-app straight to its
  // store (iPhone → App Store, Android → Google Play). Desktop, unknown devices,
  // and crawlers / link-preview bots fall through to the showcase page so it stays
  // indexable and previewable. Done here (edge) rather than in the page component
  // because in-component redirect() doesn't reliably surface as an HTTP redirect
  // under this app's OpenNext deploy — middleware redirects do.
  if (pathname === '/download-app' || pathname === '/download-app/') {
    const storeUrl = storeRedirectUrl(request.headers.get('user-agent') || '');
    if (storeUrl) {
      return NextResponse.redirect(new URL(storeUrl));
    }
  }

  // Allow access to public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Create a Supabase client that reads/writes auth cookies
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkmnzbeugdoajtzfjkxg.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt / sitemap.xml / manifest.webmanifest (public metadata files
     *   crawlers and browsers fetch unauthenticated — must never auth-redirect)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
