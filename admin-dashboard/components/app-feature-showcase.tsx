import { PhoneMockup } from '@/components/phone-mockup';
import { SCREENSHOTS } from '@/lib/app-screenshots';

/**
 * The reading journey, one screen per step. Each row pairs a real app screen
 * with what the reader does on it, ordered as a genuine sequence — explore, read,
 * understand, listen, speak, remember — so the chapter numerals carry real
 * meaning rather than decorate. Rows alternate sides on desktop; the eye zig-zags
 * down. Serif titles, a quiet numeral + label eyebrow, one paragraph, one meta
 * line. No icons, no bullet lists.
 */
export function AppFeatureShowcase() {
  return (
    <div className="space-y-24 sm:space-y-32">
      {SCREENSHOTS.map((shot, i) => {
        const reversed = i % 2 === 1;
        const chapter = String(i + 1).padStart(2, '0');

        return (
          <div key={shot.src} className="grid items-center gap-10 sm:gap-14 lg:grid-cols-2">
            {/* Screen */}
            <div className={reversed ? 'lg:order-2' : ''}>
              <PhoneMockup
                src={shot.src}
                alt={shot.alt}
                className="mx-auto w-64 sm:w-[19rem]"
                sizes="(max-width: 640px) 64vw, 304px"
              />
            </div>

            {/* Copy */}
            <div className={`text-center lg:text-left ${reversed ? 'lg:order-1' : ''}`}>
              <div className="flex items-baseline justify-center gap-3 lg:justify-start">
                <span className="font-display text-2xl leading-none tabular-nums text-primary/45">
                  {chapter}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {shot.label}
                </span>
              </div>

              <h3 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.12] tracking-[-0.01em] text-foreground sm:text-4xl">
                {shot.title}
              </h3>

              <p className="mx-auto mt-4 max-w-md text-[1.05rem] leading-relaxed text-muted-foreground lg:mx-0">
                {shot.description}
              </p>

              <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground/70 lg:mx-0">
                {shot.meta}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
