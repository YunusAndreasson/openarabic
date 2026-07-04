import { PhoneMockup } from '@/components/phone-mockup';
import { SCREENSHOTS } from '@/lib/app-screenshots';

/**
 * Each real app screen paired with what the reader can do with it. Rows alternate
 * sides on desktop so the eye zig-zags down; on mobile the screen leads. No
 * icons or bullet lists — a quiet verb label, a heading, one sentence.
 */
export function AppFeatureShowcase() {
  return (
    <div className="space-y-20 sm:space-y-28">
      {SCREENSHOTS.map((shot, i) => {
        const reversed = i % 2 === 1;

        return (
          <div key={shot.src} className="grid items-center gap-10 sm:gap-16 lg:grid-cols-2">
            {/* Screen */}
            <div className={reversed ? 'lg:order-2' : ''}>
              <PhoneMockup
                src={shot.src}
                alt={shot.alt}
                className="mx-auto w-44 sm:w-52"
                sizes="(max-width: 640px) 44vw, 208px"
              />
            </div>

            {/* Copy */}
            <div className={`text-center lg:text-left ${reversed ? 'lg:order-1' : ''}`}>
              <span className="text-sm font-medium text-primary">{shot.label}</span>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                {shot.title}
              </h3>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground lg:mx-0">
                {shot.description}
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground/70 lg:mx-0">
                {shot.meta}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
