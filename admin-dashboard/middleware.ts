import { type NextRequest, NextResponse } from 'next/server';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/account-deletion', '/privacy', '/terms', '/contact'];
const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/read/');
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for Supabase auth token in cookies
  // Supabase stores access token in this cookie format
  const authToken =
    request.cookies.get('sb-kkmnzbeugdoajtzfjkxg-auth-token')?.value ||
    request.cookies.get('sb-access-token')?.value;

  // Check for any Supabase auth cookie (backup check)
  const hasAuthCookie = Array.from(request.cookies.getAll()).some(cookie =>
    cookie.name.includes('sb-kkmnzbeugdoajtzfjkxg-auth-token'),
  );

  if (!authToken && !hasAuthCookie) {
    // No auth token found, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // User has auth cookie, allow access
  // The client-side auth provider will handle session validation
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
