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

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Check if a URL is a remote audio file
 */
export function isRemoteAudioUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
