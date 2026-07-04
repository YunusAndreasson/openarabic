import Image from 'next/image';

interface PhoneMockupProps {
  src: string;
  alt: string;
  /** Width utility classes control the rendered size (e.g. "w-56 sm:w-64"). */
  className?: string;
  /** LCP hint — set on the single most prominent mockup only. */
  priority?: boolean;
  /** Responsive-image sizes hint. */
  sizes?: string;
}

/**
 * A minimal, all-screen phone frame that wraps a real app screenshot. The bezel
 * is a near-black olive to echo the app's own UI, so the framed screen reads as
 * part of the device rather than a picture pasted onto the page. The frame's
 * aspect ratio matches the cropped screenshots (760×1060) so images fill edge to
 * edge with no letterboxing.
 */
export function PhoneMockup({
  src,
  alt,
  className,
  priority = false,
  sizes = '(max-width: 640px) 60vw, 288px',
}: PhoneMockupProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative aspect-[760/1060] rounded-[2.1rem] bg-[#0c0f0d] p-[3px] shadow-[0_16px_40px_-16px_rgb(0_0_0_/_0.5)] ring-1 ring-black/10 dark:ring-white/10">
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[1.9rem] bg-[#0b0e0c]">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            className="object-cover object-top"
          />
        </div>
      </div>
    </div>
  );
}
