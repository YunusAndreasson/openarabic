import type { PlatformInfo } from '@/lib/platform-detection';
import { StoreBadges } from '@/components/store-badges';
import { PhoneShowcase } from '@/components/phone-showcase';
import { AppRating } from '@/components/app-rating';

interface Author {
  id: number;
  name: string;
}

interface AppShowcaseHeroProps {
  platformInfo: PlatformInfo;
  authors?: Author[];
}

function formatAuthors(authors: Author[]): string | null {
  if (authors.length === 0) return null;
  if (authors.length <= 3) return authors.map((a) => a.name).join(', ');
  return `${authors.slice(0, 3).map((a) => a.name).join(', ')}, and more`;
}

/**
 * Homepage hero — the page's single <h1> and keyword intro, then the app itself:
 * store badges, a quiet App Store rating, and two real screens. Borderless and
 * calm; the type and the screenshots do the work. Server-rendered so the H1 ships
 * in the initial HTML and the front screenshot is the LCP image.
 */
export function AppShowcaseHero({ platformInfo, authors = [] }: AppShowcaseHeroProps) {
  const authorLine = formatAuthors(authors);

  return (
    <section
      aria-labelledby="home-hero-title"
      className="mb-12 border-b border-border/60 pb-12 sm:mb-16 sm:pb-16"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        {/* Left: pitch */}
        <div className="max-w-xl text-center sm:text-left">
          <h1
            id="home-hero-title"
            className="text-4xl font-semibold tracking-[-0.02em] text-foreground sm:text-5xl sm:leading-[1.05]"
          >
            Learn to Read Arabic Through Authentic Texts
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Classical Islamic texts in Arabic, side by side with English. Tap any word for its
            meaning and native audio — and remember it with spaced repetition.
          </p>

          <StoreBadges
            platformInfo={platformInfo}
            showBoth={!platformInfo.isMobile}
            className="mt-8 justify-center sm:justify-start"
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm sm:justify-start">
            <AppRating />
            <span className="text-muted-foreground" aria-hidden>
              ·
            </span>
            <span className="text-muted-foreground">Free, no ads</span>
          </div>

          {authorLine && (
            <p className="mt-6 text-sm text-muted-foreground">Featuring {authorLine}.</p>
          )}
        </div>

        {/* Right: the app, shown not told */}
        <div className="lg:pl-4">
          <PhoneShowcase priority />
        </div>
      </div>
    </section>
  );
}
