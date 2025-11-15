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
  other: {
    // Enable View Transitions API for modern browsers
    'view-transition': 'same-origin',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://openarabic.io',
    siteName: 'OpenArabic',
    title: 'OpenArabic - Learn Arabic Through Reading',
    description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
    images: [
      {
        url: 'https://openarabic.io/oaLogo.png',
        width: 1200,
        height: 630,
        alt: 'OpenArabic - Learn Arabic Through Reading',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@openarabicio',
    creator: '@openarabicio',
    title: 'OpenArabic - Learn Arabic Through Reading',
    description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
    images: ['https://openarabic.io/oaLogo.png'],
  },
  alternates: {
    canonical: 'https://openarabic.io',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resource hints for faster external requests */}
        <link rel="preconnect" href="https://kkmnzbeugdoajtzfjkxg.supabase.co" />
        <link rel="dns-prefetch" href="https://kkmnzbeugdoajtzfjkxg.supabase.co" />

        {/* Preload logo for LCP optimization */}
        <link
          rel="preload"
          href="/oaLogo.png"
          as="image"
          fetchPriority="high"
        />
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
