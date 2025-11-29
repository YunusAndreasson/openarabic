'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeProvider } from '@/components/providers/theme-provider';

// Routes that should NOT show the admin header
const PUBLIC_ROUTES = ['/', '/login', '/account-deletion', '/privacy', '/terms', '/contact', '/download-app'];
const isPublicRoute = (path: string) => {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/read/');
};

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAdminHeader = !isPublicRoute(pathname);

  if (!showAdminHeader) {
    // Public pages render their own layout with ThemeProvider
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  // Admin pages get the admin header
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">OpenArabic Admin</h1>
            <nav className="flex gap-4">
              <Link href="/admin/articles" className="text-sm font-medium hover:underline underline-offset-4">
                Articles
              </Link>
              <Link href="/images" className="text-sm font-medium hover:underline underline-offset-4">
                Images
              </Link>
              <Link href="/admin" className="text-sm font-medium hover:underline underline-offset-4">
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
            </nav>
          </div>
        </div>
      </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </ThemeProvider>
  );
}
