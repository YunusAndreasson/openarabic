import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { detectPlatform } from '@/lib/platform-detection';
import { StoreBadges } from '@/components/store-badges';
import { AppStructuredData } from '@/components/app-structured-data';
import { PhoneShowcase } from '@/components/phone-showcase';
import { AppFeatureShowcase } from '@/components/app-feature-showcase';
import { AppRating } from '@/components/app-rating';
import { APP_NAME, APP_DESCRIPTION } from '@/lib/app';
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

/** Small uppercase overline that echoes the app's own section labels. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{children}</p>
  );
}

// Recognisable scholars to surface first in the "what you'll read" line, matched
// against the real author catalogue (a plain alphabetical list buries the famous
// names and can show near-duplicate transliterations). Only names actually in the
// library are ever shown.
const MARQUEE_SCHOLARS = [
  'Qayyim',
  'Taymiyyah',
  'Jawzi',
  'Nawawi',
  'Ghazali',
  'Bukhari',
  'Dhahabi',
  'Suyuti',
  'Tabari',
  'Hanbal',
] as const;

function pickScholars(all: string[], max = 8): { names: string[]; more: boolean } {
  const chosen: string[] = [];
  const used = new Set<number>();

  for (const key of MARQUEE_SCHOLARS) {
    const idx = all.findIndex((n, i) => !used.has(i) && n.toLowerCase().includes(key.toLowerCase()));
    if (idx !== -1) {
      chosen.push(all[idx]);
      used.add(idx);
    }
  }
  for (let i = 0; i < all.length && chosen.length < max; i++) {
    if (!used.has(i)) {
      chosen.push(all[i]);
      used.add(i);
    }
  }

  return { names: chosen.slice(0, max), more: all.length > Math.min(max, chosen.length) };
}

export default async function DownloadPage() {
  // Mobile visitors are redirected to their store in middleware; desktop / bots
  // reach this showcase. Author + category names are pulled from the same
  // catalogue the app reads, so the "what you'll read" section can never claim a
  // scholar or topic that isn't actually in the library.
  const [platformInfo, authorsResult, categoriesResult] = await Promise.all([
    detectPlatform(),
    supabase.from('authors').select('name').order('name'),
    supabase.from('categories').select('name').order('name'),
  ]);

  const authors = (authorsResult.data ?? [])
    .map((a) => a.name)
    .filter((n): n is string => Boolean(n));
  const categories = (categoriesResult.data ?? [])
    .map((c) => c.name)
    .filter((n): n is string => Boolean(n));

  const { names: scholars, more: moreScholars } = pickScholars(authors);
  const scholarLine = scholars.join('  ·  ') + (moreScholars ? '  ·  and more' : '');

  return (
    <>
      <AppStructuredData />
      <div className="bg-background">
        {/* Hero — pitch left, the app itself right */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* Left: pitch */}
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <div className="flex items-center justify-center gap-2.5 lg:justify-start">
                <Image
                  src="/oaLogo.png"
                  alt={APP_NAME}
                  width={34}
                  height={34}
                  className="logo rounded-[8px]"
                  priority
                />
                <span className="text-sm font-medium tracking-wide text-foreground">
                  {APP_NAME}
                </span>
              </div>

              <h1 className="mt-8 font-display text-5xl font-medium leading-[1.03] tracking-[-0.02em] text-foreground sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]">
                Read classical Arabic,{' '}
                <span className="italic text-primary">even as a beginner.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl lg:mx-0">
                The words of Ibn al-Qayyim, Ibn Taymiyyah and Imam Nawawī — in Arabic beside English.
                Tap any word for its meaning and native audio, say it back out loud, and let spaced
                repetition make it stick.
              </p>

              <StoreBadges
                platformInfo={platformInfo}
                showBoth
                className="mt-9 justify-center lg:justify-start"
              />

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm lg:justify-start">
                <AppRating />
                <span className="text-muted-foreground" aria-hidden>
                  ·
                </span>
                <span className="text-muted-foreground">Free, no ads · iPhone &amp; Android</span>
              </div>
            </div>

            {/* Right: the app, shown */}
            <div className="lg:pl-8">
              <PhoneShowcase className="max-w-[24rem] sm:max-w-[30rem]" priority />
            </div>
          </div>
        </section>

        {/* What you'll read — the substance behind the app */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
            <Eyebrow>What you’ll read</Eyebrow>

            <h2 className="mx-auto mt-6 max-w-2xl font-display text-[2rem] font-medium leading-[1.12] tracking-[-0.01em] text-foreground sm:text-[2.75rem]">
              Real books by real scholars — not a phrasebook.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Short works and excerpts on creed, jurisprudence, the Prophet’s life, hadith and
              tafsīr — chosen because they’re worth reading, and graded by difficulty so that you can.
            </p>

            {scholarLine && (
              <p className="mx-auto mt-10 max-w-3xl font-display text-lg italic text-foreground/80 sm:text-xl">
                {scholarLine}
              </p>
            )}

            {categories.length > 0 && (
              <p className="mt-4 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                {categories.join('  ·  ')}
              </p>
            )}
          </div>
        </section>

        {/* The reading journey */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32">
            <div className="mx-auto mb-20 max-w-2xl text-center sm:mb-28">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-6 font-display text-4xl font-medium leading-[1.08] tracking-[-0.01em] text-foreground sm:text-5xl">
                Learn to read by reading.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Just enough help to keep you moving through a real text — and a system that quietly
                remembers every word you touch.
              </p>
            </div>

            <AppFeatureShowcase />
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 px-6 py-24 text-center sm:py-32">
          <div className="mx-auto max-w-2xl">
            <Eyebrow>Free · no ads</Eyebrow>
            <h2 className="mt-6 font-display text-4xl font-medium leading-[1.08] tracking-[-0.01em] text-foreground sm:text-5xl">
              Open the book tonight.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Start with one short text. Tap what you don’t know, hear it read, say it back — and let
              the app carry it in your memory.
            </p>
            <StoreBadges platformInfo={platformInfo} showBoth className="mt-9 justify-center" />
          </div>
        </section>
      </div>
    </>
  );
}
