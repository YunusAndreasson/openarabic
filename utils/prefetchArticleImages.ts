import { Image } from 'expo-image';
import { generateStorageUrl } from '@/utils/storageUtils';

export async function prefetchArticleImages(paths: readonly (string | null | undefined)[]) {
  const urls = new Set<string>();
  for (const path of paths) {
    if (typeof path !== 'string' || !path.trim()) continue;
    const value = path.trim();
    // Storage keys may contain folders and spaces. Absolute inputs must be
    // valid HTTP(S) URLs before they can reach the native image loader.
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(value) && !/^https?:\/\//i.test(value)) continue;
    try {
      const url = new URL(
        /^https?:\/\//i.test(value) ? value : generateStorageUrl('images', value),
      );
      if (url.hostname && (url.protocol === 'https:' || url.protocol === 'http:')) {
        urls.add(url.href);
      }
    } catch {
      // One malformed catalogue entry must not discard the rest of the batch.
    }
  }
  if (urls.size) await Image.prefetch([...urls], { cachePolicy: 'memory-disk' });
}
