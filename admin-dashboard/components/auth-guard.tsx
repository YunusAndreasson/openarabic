'use client';

import { useAuth } from './auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AppHeader } from './app-header';

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/account-deletion'];
const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/read/');
};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user and not on public route, redirect to login
    if (!loading && !user && !isPublicRoute(pathname)) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // Show loading spinner while checking auth (only for protected routes)
  if (loading && !isPublicRoute(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If on login page or public route, render without header/container
  if (pathname === '/login' || isPublicRoute(pathname)) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // If no user and not on public route, don't render anything (redirect will happen)
  if (!user) {
    return null;
  }

  // User is authenticated on protected route, show header and content
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
