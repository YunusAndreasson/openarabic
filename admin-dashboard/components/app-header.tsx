'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { LogoutButton } from './logout-button';

export function AppHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Don't show header while loading or if user is not authenticated
  if (loading || !user) {
    return null;
  }

  // Hide header on public routes (homepage and article reader)
  const isPublicRoute = pathname === '/' || pathname?.startsWith('/read/');
  if (isPublicRoute) {
    return null;
  }

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">OpenArabic Admin</h1>
          <nav className="flex gap-4 items-center">
            <Link
              href="/admin/articles"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Articles
            </Link>
            <Link
              href="/images"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Images
            </Link>
            <Link
              href="/admin"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Admin
            </Link>
            <Link
              href="/admin/analytics"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Analytics
            </Link>
            <Link
              href="/admin/translation-reviews"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Word Reviews
            </Link>
            <Link
              href="/admin/root-reviews"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Root Reviews
            </Link>
            <div className="ml-4 pl-4 border-l">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
