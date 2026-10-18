// Local-time date label helpers (DRY across the forecast charts).
// The forecast buckets are built at LOCAL end-of-day (fsrsUtils
// generateForecastDates), so labels must render in the device timezone —
// formatting them as UTC shifted every label a day forward west of UTC.
export const formatWeekday = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short' });
