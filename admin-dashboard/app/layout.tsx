import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { LayoutWrapper } from '@/components/layout-wrapper';
import { SmartAppBanner } from '@/components/smart-app-banner';
import { SiteStructuredData } from '@/components/site-structured-data';
import { GoogleAnalytics } from '@/components/google-analytics';
import { detectPlatform } from '@/lib/platform-detection';
import { APP_STORE_ID } from '@/lib/app';
import { SITE_URL } from '@/lib/constants';

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
  metadataBase: new URL(SITE_URL),
  title: 'OpenArabic - Learn Arabic Through Reading',
  description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
  // The maker behind OpenArabic. Renders <meta name="author"> / <meta name="creator">.
  // The brand keeps its own twitter:site/creator tags below; the Person identity
  // is carried in the JSON-LD Person node (see site-structured-data.tsx).
  authors: [{ name: 'Yunus Andreasson', url: 'https://andreassonphoto.com' }],
  creator: 'Yunus Andreasson',
  // Google Search Console ownership verification (HTML-tag method). The token
  // renders as a public <meta> tag and is tied to the openarabic.io property,
  // so it's safe to hardcode.
  verification: { google: '7Ph-VBorESFEHDcvOZq7wp9DHLUe88ARuxlwaPseG00' },
  other: {
    // Enable View Transitions API for modern browsers
    'view-transition': 'same-origin',
  },
  // Native iOS Smart App Banner (Safari renders a dismissible install nudge
  // from this tag). The custom SmartAppBanner suppresses itself on iOS Safari
  // to avoid a double banner.
  itunes: {
    appId: APP_STORE_ID,
    appArgument: `${SITE_URL}/download-app`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'OpenArabic',
    title: 'OpenArabic - Learn Arabic Through Reading',
    description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
    images: [
      {
        url: `${SITE_URL}/og.png`,
        width: 1200,
        height: 630,
        alt: 'OpenArabic — read classical Arabic, even as a beginner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@openarabicio',
    creator: '@openarabicio',
    title: 'OpenArabic - Learn Arabic Through Reading',
    description: 'Read Arabic articles with parallel English translations. Improve your Arabic reading skills with authentic content.',
    images: [`${SITE_URL}/og.png`],
  },
  alternates: {
    canonical: SITE_URL,
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
        {/* Google Analytics (gtag.js) — must be in <head> for Search Console
            "Google Analytics" ownership verification. */}
        <GoogleAnalytics />

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
        <SiteStructuredData />
        <SmartAppBanner platformInfo={platformInfo} />
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
