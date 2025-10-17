import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpenArabic Admin Dashboard',
  description: 'Manage articles for OpenArabic app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">OpenArabic Admin</h1>
                <nav className="flex gap-4">
                  <Link
                    href="/"
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
                </nav>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
