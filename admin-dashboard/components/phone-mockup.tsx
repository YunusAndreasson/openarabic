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
 * aspect ratio matches a modern full-screen iPhone capture (1206×2622) so images
 * fill edge to edge with no letterboxing and read as a real device.
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
      <div className="relative aspect-[1206/2622] rounded-[2.5rem] bg-[#0c0f0d] p-[4px] shadow-[0_20px_50px_-18px_rgb(0_0_0_/_0.55)] ring-1 ring-black/10 dark:ring-white/10">
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[2.15rem] bg-[#0b0e0c]">
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
