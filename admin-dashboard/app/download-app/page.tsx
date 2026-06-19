import type { Metadata } from 'next';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { detectPlatform } from '@/lib/platform-detection';
import { StoreBadges } from '@/components/store-badges';
import { AppStructuredData } from '@/components/app-structured-data';
import { ArabicWordCloud } from '@/components/arabic-word-cloud';
import {
  APP_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
  APP_FEATURES,
} from '@/lib/app';

export const metadata: Metadata = {
  title: 'Download OpenArabic - Read Classical Islamic Texts in Arabic & English',
  description: APP_DESCRIPTION,
  alternates: {
    canonical: 'https://openarabic.io/download-app',
  },
  openGraph: {
    title: 'Download OpenArabic',
    description:
      'Classical Islamic texts in Arabic & English with audio. Free on iOS and Android.',
    url: 'https://openarabic.io/download-app',
    images: [
      {
        url: 'https://openarabic.io/oaLogo.png',
        width: 512,
        height: 512,
        alt: 'OpenArabic App',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Download OpenArabic',
    description:
      'Classical Islamic texts in Arabic & English with audio. Free on iOS and Android.',
    images: ['https://openarabic.io/oaLogo.png'],
  },
};

export default async function DownloadPage() {
  const platformInfo = await detectPlatform();

  return (
    <>
      <AppStructuredData />
      <div className="min-h-screen bg-background px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Hero */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
            {/* Left: pitch */}
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <Image
                  src="/oaLogo.png"
                  alt={APP_NAME}
                  width={96}
                  height={96}
                  className="rounded-[22px] shadow-lg"
                  priority
                />
              </div>

              <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Free &amp; No Ads
              </span>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {APP_NAME}
              </h1>

              <p className="mt-3 text-lg font-medium text-foreground/90">
                {APP_TAGLINE}
              </p>

              <p className="mx-auto mt-3 max-w-prose text-muted-foreground lg:mx-0">
                {APP_DESCRIPTION}
              </p>

              <StoreBadges
                platformInfo={platformInfo}
                showBoth
                className="mt-8 justify-center lg:justify-start"
              />

              <p className="mt-4 text-xs text-muted-foreground">
                Free to download. Start your Arabic journey today.
              </p>
            </div>

            {/* Right: visual.
               Reuses the interactive Arabic word cloud (also the homepage-hero
               visual). Swap in real app screenshots / a phone mockup here when
               store assets are available. */}
            <div className="mt-12 lg:mt-0">
              <ArabicWordCloud />
            </div>
          </div>

          {/* Feature grid */}
          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {APP_FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
