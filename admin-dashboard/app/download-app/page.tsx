import type { Metadata } from 'next';
import Image from 'next/image';
import { detectPlatform } from '@/lib/platform-detection';
import { StoreBadges } from '@/components/store-badges';
import { AppStructuredData } from '@/components/app-structured-data';
import { PhoneShowcase } from '@/components/phone-showcase';
import { AppFeatureShowcase } from '@/components/app-feature-showcase';
import { AppRating } from '@/components/app-rating';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/lib/app';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Download OpenArabic - Read Classical Islamic Texts in Arabic & English',
  description: APP_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/download-app`,
  },
  openGraph: {
    title: 'Download OpenArabic',
    description:
      'Classical Islamic texts in Arabic & English with audio. Free on iOS and Android.',
    url: `${SITE_URL}/download-app`,
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
    title: 'Download OpenArabic',
    description:
      'Classical Islamic texts in Arabic & English with audio. Free on iOS and Android.',
    images: [`${SITE_URL}/og.png`],
  },
};

export default async function DownloadPage() {
  // Mobile visitors are redirected to their store in middleware (see
  // middleware.ts); desktop / bots reach this showcase. platformInfo still tunes
  // which store badge leads on the rare mobile hit that isn't redirected.
  const platformInfo = await detectPlatform();

  return (
    <>
      <AppStructuredData />
      <div className="bg-background">
        {/* Hero */}
        <section className="px-6 pt-16 sm:pt-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex items-center justify-center gap-2.5">
              <Image
                src="/oaLogo.png"
                alt={APP_NAME}
                width={40}
                height={40}
                className="logo rounded-[9px]"
                priority
              />
              <span className="font-medium text-foreground">{APP_NAME}</span>
            </div>

            <h1 className="mt-8 text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-6xl sm:leading-[1.03]">
              {APP_TAGLINE}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              {APP_DESCRIPTION}
            </p>

            <StoreBadges platformInfo={platformInfo} showBoth className="mt-9 justify-center" />

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm">
              <AppRating />
              <span className="text-muted-foreground" aria-hidden>
                ·
              </span>
              <span className="text-muted-foreground">Free, no ads · iPhone &amp; Android</span>
            </div>
          </div>

          {/* The app, shown */}
          <div className="mt-16 sm:mt-20">
            <PhoneShowcase className="max-w-sm" priority />
          </div>
        </section>

        {/* Feature showcase */}
        <section className="px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-5xl">
            <div className="mb-16 max-w-2xl sm:mb-24">
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
                Learn to read by reading
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Real classical texts, not a phrasebook — with just enough help to keep you moving
                through them.
              </p>
            </div>
            <AppFeatureShowcase />
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 px-6 py-24 text-center sm:py-28">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            Open the book tonight
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
            Start with one short text. Tap what you don’t know, hear it, and let the app remember
            it for you.
          </p>
          <StoreBadges platformInfo={platformInfo} showBoth className="mt-9 justify-center" />
        </section>
      </div>
    </>
  );
}
