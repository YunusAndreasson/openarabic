import Image from 'next/image';
import type { PlatformInfo } from '@/lib/platform-detection';

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
    title: 'Download OpenArabic',
    description:
      'A free app for learning Arabic through real texts with translations and native audio.',
  },
  inline: {
    title: 'Continue reading in the app',
    description:
      'Read more articles with translations, listen to native audio, and build your vocabulary.',
  },
} as const;

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
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/85 active:bg-primary/70 text-primary-foreground rounded-full transition-colors duration-150 font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <AppleLogo className="w-4 h-4" />
            <span>Get the app</span>
          </a>
        )}
        {showGooglePlay && (
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/85 active:bg-primary/70 text-primary-foreground rounded-full transition-colors duration-150 font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <PlayStoreLogo className="w-4 h-4" />
            <span>Get the app</span>
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
      if (authors.length <= 3) {
        return authors.map((a) => a.name).join(', ');
      }
      const shown = authors
        .slice(0, 3)
        .map((a) => a.name)
        .join(', ');
      return `${shown} & ${authors.length - 3} more`;
    };

    return (
      <section
        className="bg-secondary rounded-2xl"
        style={{ contain: 'layout style paint' }}
        aria-labelledby="hero-cta-title"
      >
        <div className="px-6 py-10 sm:px-8 sm:py-12 text-center">
          <h2
            id="hero-cta-title"
            className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight"
          >
            {finalTitle}
          </h2>

          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {finalDescription}
          </p>

          <div className="mt-6">{storeButtons}</div>

          {authors.length > 0 && (
            <p className="mt-5 text-xs text-gray-500 dark:text-gray-500">
              Featuring {formatAuthors()}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 md:p-8"
      style={{ contain: 'layout style paint' }}
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
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {finalTitle}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
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
