import Image from 'next/image';
import type { PlatformInfo } from '@/lib/platform-detection';
import { ArabicWordCloud } from '@/components/arabic-word-cloud';
import { StoreBadges } from '@/components/store-badges';
import { APP_TAGLINE, APP_DESCRIPTION, APP_FEATURES } from '@/lib/app';

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

const DEFAULTS = {
  hero: {
    title: APP_TAGLINE,
    description: APP_DESCRIPTION,
  },
  inline: {
    title: 'Continue reading in the app',
    description:
      'Read more articles with translations, listen to native audio, and build your vocabulary.',
  },
} as const;

// The "Free & No Ads" pulse badge already conveys the 4th feature.
const FEATURE_CHIPS = APP_FEATURES.slice(0, 3);

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
              {FEATURE_CHIPS.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>

            {/* Store Badges */}
            <StoreBadges
              platformInfo={platformInfo}
              showBoth={showBothStores}
              className="mt-6 justify-center sm:justify-start"
            />

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
    <div className="bg-card border border-border rounded-xl p-6 md:p-8">
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
          <p className="text-muted-foreground mb-6">{finalDescription}</p>
          <StoreBadges
            platformInfo={platformInfo}
            showBoth={showBothStores}
            className="justify-center md:justify-start"
          />
        </div>
      </div>
    </div>
  );
}
