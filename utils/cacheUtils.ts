/**
 * Format bytes to human readable string
 */
import { STRINGS } from '@/constants/strings';

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return `0 ${STRINGS.BYTE_UNITS[0]}`;

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = STRINGS.BYTE_UNITS;

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Ensure i is within bounds of the sizes array
  const boundedIndex = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / k ** boundedIndex).toFixed(dm))} ${sizes[boundedIndex]}`;
}

/**
 * Check if a URL is a remote audio file
 */
export function isRemoteAudioUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
