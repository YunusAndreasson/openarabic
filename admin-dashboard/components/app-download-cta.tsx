import Image from 'next/image';
import type { PlatformInfo } from '@/lib/platform-detection';
import { ArabicWordCloud } from '@/components/arabic-word-cloud';

const AppleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const PlayStoreLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
  </svg>
);

interface Author {
  id: number;
  name: string;
}

interface AppDownloadCTAProps {
  platformInfo: PlatformInfo;
  variant?: 'hero' | 'inline';
  title?: string;
  description?: string;
  showBothStores?: boolean;
  authors?: Author[];
}

const APP_STORE_URL = 'https://apps.apple.com/ae/app/openarabic/id1594031029';
const GOOGLE_PLAY_URL =
  'https://play.google.com/store/apps/details?id=com.edenmind.OpenArabic';

const DEFAULTS = {
  hero: {
    title: 'Read Classical Arabic — Even as a Beginner',
    description:
      'Read real Islamic texts sentence by sentence with translations, tap unknown words to learn them, and build vocabulary through spaced repetition.',
  },
  inline: {
    title: 'Continue reading in the app',
    description:
      'Read more articles with translations, listen to native audio, and build your vocabulary.',
  },
} as const;

const FEATURES = [
  'Bilingual texts',
  'Native audio',
  'Spaced repetition',
] as const;

export function AppDownloadCTA({
  platformInfo,
  variant = 'inline',
  title,
  description,
  showBothStores = false,
  authors = [],
}: AppDownloadCTAProps) {
  if (!platformInfo.isMobile && !showBothStores) {
    return null;
  }

  const finalTitle = title ?? DEFAULTS[variant].title;
  const finalDescription = description ?? DEFAULTS[variant].description;
  const showAppStore = showBothStores || platformInfo.platform === 'ios';
  const showGooglePlay = showBothStores || platformInfo.platform === 'android';

  const storeButtons =
    variant === 'hero' ? (
      <>
        {showAppStore && (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background rounded-xl transition-colors duration-150 font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <AppleLogo className="w-7 h-7 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[10px] opacity-80 leading-tight">Download on the</div>
              <div className="text-base font-semibold leading-tight">App Store</div>
            </div>
          </a>
        )}
        {showGooglePlay && (
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-foreground hover:bg-foreground/90 active:bg-foreground/80 text-background rounded-xl transition-colors duration-150 font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <PlayStoreLogo className="w-6 h-6 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[10px] uppercase opacity-80 leading-tight">Get it on</div>
              <div className="text-base font-semibold leading-tight">Google Play</div>
            </div>
          </a>
        )}
      </>
    ) : (
      <>
        {showAppStore && (
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-primary hover:bg-primary/85 active:bg-primary/70 text-primary-foreground rounded-lg transition-colors duration-150 font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <AppleLogo className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[10px] opacity-80">Download on the</div>
              <div className="text-sm font-semibold">App Store</div>
            </div>
          </a>
        )}
        {showGooglePlay && (
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-primary hover:bg-primary/85 active:bg-primary/70 text-primary-foreground rounded-lg transition-colors duration-150 font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <PlayStoreLogo className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <div className="text-[10px] opacity-80">GET IT ON</div>
              <div className="text-sm font-semibold">Google Play</div>
            </div>
          </a>
        )}
      </>
    );

  if (variant === 'hero') {
    const formatAuthors = () => {
      if (authors.length === 0) return null;
      if (authors.length <= 2) {
        return authors.map((a) => a.name).join(' and ');
      }
      const allButLast = authors.slice(0, -1).map((a) => a.name).join(', ');
      return `${allButLast} and ${authors[authors.length - 1].name}`;
    };

    return (
      <section
        className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary to-primary/5 dark:from-primary/10 dark:via-secondary dark:to-primary/10 rounded-2xl border border-primary/10"
        aria-labelledby="hero-cta-title"
      >
        <div className="px-6 py-10 sm:px-10 sm:py-12 lg:grid lg:grid-cols-5 lg:gap-8 lg:items-center">
          {/* Left: Content (3 cols on desktop) */}
          <div className="text-center sm:text-left lg:col-span-3">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 text-xs font-medium bg-primary/10 text-primary rounded-full">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              Free &amp; No Ads
            </span>

            <h2
              id="hero-cta-title"
              className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"
            >
              {finalTitle}
            </h2>

            <p className="mt-2 text-muted-foreground max-w-lg mx-auto sm:mx-0">
              {finalDescription}
            </p>

            {/* Features */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
              {FEATURES.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Store Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3">
              {storeButtons}
            </div>

            {/* Authors */}
            {authors.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Featuring works by {formatAuthors()}
              </p>
            )}
          </div>

          {/* Right: Word Cloud (2 cols on desktop, hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-2">
            <ArabicWordCloud />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-xl p-6 md:p-8"
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <Image
          src="/oaLogo.png"
          alt="OpenArabic Logo"
          width={64}
          height={64}
          className="logo flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            {finalTitle}
          </h3>
          <p className="text-muted-foreground mb-6">
            {finalDescription}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            {storeButtons}
          </div>
        </div>
      </div>
    </div>
  );
}
