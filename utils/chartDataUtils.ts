// Generate date range for charts - using UTC to avoid timezone issues
export const generateDateRange = (days: number) => {
  const today = new Date();
  // Create UTC date for today at 23:59:59.999
  const utcToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999),
  );

  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(utcToday);
    date.setUTCDate(utcToday.getUTCDate() - i);
    dates.push(date);
  }

  return dates;
};

// Note: calculateRetrievability is available from @/utils/fsrsUtils

/**
 * Creates a smooth area fill path for line charts
 * @param smoothPath - The main line path
 * @param graphHeight - Height of the graph
 * @param firstX - X coordinate of the first data point (optional, defaults to 0)
 * @param lastX - X coordinate of the last data point (required for proper area fill)
 * @returns Area fill path string with vertical edges (not tilted)
 */
export const createAreaFillPath = (
  smoothPath: string,
  graphHeight: number,
  firstX?: number,
  lastX?: number,
): string => {
  // Use provided coordinates or fall back to defaults
  const startX = firstX ?? 0;
  const endX = lastX ?? 0;

  // Create vertical edges for fill area:
  // 1. Follow the smooth path from start to end
  // 2. Drop straight down from last point: L endX graphHeight
  // 3. Go left along bottom: L startX graphHeight
  // 4. Close path by going back up to start: Z
  return `${smoothPath} L ${endX} ${graphHeight} L ${startX} ${graphHeight} Z`;
};

// Local-time date label helpers (DRY across the forecast charts).
// The forecast buckets are built at LOCAL end-of-day (fsrsUtils
// generateForecastDates), so labels must render in the device timezone —
// formatting them as UTC shifted every label a day forward west of UTC.
export const formatWeekday = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

export const formatMonthDay = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
