import type { ImageLoaderProps } from 'next/image';

const SUPABASE_HOST = 'kkmnzbeugdoajtzfjkxg.supabase.co';

// Compare the parsed origin: a prefix check also accepts
// https://kkmnzbeugdoajtzfjkxg.supabase.co.evil.example/...
function isSupabaseImage(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && url.hostname === SUPABASE_HOST;
  } catch {
    return false;
  }
}

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
  if (isSupabaseImage(src)) {
    // Use Cloudflare Image Resizing for Supabase images
    // Format: /cdn-cgi/image/width=X,quality=Y,format=auto/SOURCE_URL
    const params = [`width=${width}`, `quality=${quality || 75}`, 'format=auto'];
    return `/cdn-cgi/image/${params.join(',')}/${src}`;
  }

  // For local images (like logo), serve directly
  // Cloudflare will handle compression and caching
  return src;
}
