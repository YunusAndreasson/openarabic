/**
 * Shared time utilities for formatting and safe calculations
 */

/**
 * Format seconds to M:SS (e.g., 1:05)
 */
export function formatSecondsToClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a Date to 12-hour clock string using native toLocaleTimeString
 * Returns format like "2:30 PM" in US locale
 */
export function formatDateTo12hClock(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Safely compute a percentage (0-100) from position and duration.
 */
export function safePercent(position: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  if (!Number.isFinite(position) || position < 0) return 0;
  const pct = (position / duration) * 100;
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}
