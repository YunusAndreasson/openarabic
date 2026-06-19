import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { SmartAppBanner } from '@/components/smart-app-banner';
import { detectPlatform } from '@/lib/platform-detection';
import { APP_STORE_ID } from '@/lib/app';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const madina = localFont({
  src: '../public/fonts/madina.woff2',
  variable: '--font-madina',
  display: 'optional',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8faf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1412' },
  ],
};

export const metadata: Metadata = {
  title: 'OpenArabic - Learn Arabic Through Reading',
  description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
  other: {
    // Enable View Transitions API for modern browsers
    'view-transition': 'same-origin',
  },
  // Native iOS Smart App Banner (Safari renders a dismissible install nudge
  // from this tag). The custom SmartAppBanner suppresses itself on iOS Safari
  // to avoid a double banner.
  itunes: {
    appId: APP_STORE_ID,
    appArgument: 'https://openarabic.io/download-app',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Detect user's platform for app download features
  const platformInfo = await detectPlatform();

  return (
    <html lang="en" className={`${inter.variable} ${madina.variable}`} suppressHydrationWarning>
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
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SmartAppBanner platformInfo={platformInfo} />
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
