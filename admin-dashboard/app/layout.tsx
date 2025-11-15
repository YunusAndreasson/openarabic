import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutWrapper } from '@/components/layout-wrapper';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OpenArabic - Learn Arabic Through Reading',
  description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('openarabic-theme');
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const appliedTheme = theme === 'system' || !theme ? systemTheme : theme;
                document.documentElement.classList.add(appliedTheme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
