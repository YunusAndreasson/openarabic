/**
 * Expected structure returned by useChartColors
 */
export interface ChartColors {
  /** UI related chart colors */
  ui: {
    grid: string;
    accent: string;
    dataLine: string;
    threshold: string;
  };
  /** Data point colors for chart dots */
  dataPoint: {
    primary: string;
    inner: string;
  };
  /** Helper to apply opacity to a color */
  withOpacity: (color: string, opacity: number) => string;
}
