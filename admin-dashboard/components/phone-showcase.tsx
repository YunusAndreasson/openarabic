import { PhoneMockup } from '@/components/phone-mockup';
import { HERO_SCREENSHOTS } from '@/lib/app-screenshots';

interface PhoneShowcaseProps {
  className?: string;
  /** Set on the homepage hero so the front screen is a strong LCP candidate. */
  priority?: boolean;
}

/**
 * Two real app screens — the front one straight and dominant, a second peeking
 * behind it. No glow, no callouts: the screenshots carry it. The bilingual
 * reading screen leads; the dictionary/audio screen sits behind.
 */
export function PhoneShowcase({ className, priority = false }: PhoneShowcaseProps) {
  return (
    <div className={`relative mx-auto w-full ${className ?? 'max-w-[22rem]'}`}>
      {/* Behind: dictionary / audio screen */}
      <div className="absolute right-0 top-[6%] w-[55%] rotate-[5deg]">
        <PhoneMockup
          src={HERO_SCREENSHOTS.back.src}
          alt={HERO_SCREENSHOTS.back.alt}
          sizes="(max-width: 640px) 45vw, 280px"
        />
      </div>

      {/* Front: bilingual reading screen */}
      <div className="relative z-10 w-[72%]">
        <PhoneMockup
          src={HERO_SCREENSHOTS.front.src}
          alt={HERO_SCREENSHOTS.front.alt}
          priority={priority}
          sizes="(max-width: 640px) 60vw, 360px"
        />
      </div>
    </div>
  );
}
