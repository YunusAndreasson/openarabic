import type { ImageLoaderProps } from 'next/image';

/**
 * Custom image loader for Cloudflare Pages deployment
 * Uses Cloudflare's image resizing service for automatic optimization
 * In development, returns images unoptimized
 *
 * @see https://developers.cloudflare.com/images/image-resizing/
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  // In development, return images unoptimized (Cloudflare services not available locally)
  if (process.env.NODE_ENV === 'development') {
    return src;
  }

  // Handle external Supabase images in production
  if (src.startsWith('https://kkmnzbeugdoajtzfjkxg.supabase.co')) {
    // Use Cloudflare Image Resizing for Supabase images
    // Format: /cdn-cgi/image/width=X,quality=Y,format=auto/SOURCE_URL
    const params = [`width=${width}`, `quality=${quality || 75}`, 'format=auto'];
    return `/cdn-cgi/image/${params.join(',')}/${src}`;
  }

  // For local images (like logo), serve directly
  // Cloudflare will handle compression and caching
  return src;
}
