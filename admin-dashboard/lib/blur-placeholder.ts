/**
 * Generate shimmer blur placeholder for images
 * 2025 best practice for perceived performance
 */

const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#e8f1ec" offset="20%" />
      <stop stop-color="#f7faf8" offset="50%" />
      <stop stop-color="#e8f1ec" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#e8f1ec" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

/**
 * Generate a shimmer blur data URL for Next.js Image placeholder
 * @param w - Width of the shimmer
 * @param h - Height of the shimmer
 * @returns Base64 encoded shimmer SVG data URL
 */
export const getShimmerBlurDataURL = (w: number, h: number): string => {
  return `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;
};

/**
 * Default blur data URL for article cards (golden ratio aspect)
 */
export const ARTICLE_CARD_BLUR = getShimmerBlurDataURL(700, 432);

/**
 * Default blur data URL for article headers (wider aspect)
 */
export const ARTICLE_HEADER_BLUR = getShimmerBlurDataURL(1200, 600);
