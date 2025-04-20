/**
 * Date utility functions for formatting and manipulation
 */

/**
 * Formats a date as a time ago string (e.g., "5m ago", "2h ago")
 * @param date - The date to format (string or Date object)
 * @returns A human-readable string representing how long ago the date was
 */
export function formatTimeAgo(date: string | Date): string {
  const articleDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMillis = now.getTime() - articleDate.getTime();
  const diffInSeconds = Math.floor(diffInMillis / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  } else {
    return `${diffInMonths}mo ago`;
  }
}

/**
 * Gets the current day of the year (1-366)
 * @returns The current day of the year
 */
export function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}
