export interface DataPoint<T = unknown> {
  x: number;
  y: number;
  value: string;
  label: string;
  data?: T;
}

export interface LegendItemProps {
  type: 'area' | 'bar' | 'dot' | 'line';
  color: string;
  label: string;
}

/**
 * Opacity values used for chart elements
 */
export interface ChartOpacity {
  SOLID: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  SUBTLE: number;
  MINIMAL: number;
  [key: string]: number;
}

/**
 * Expected structure returned by useChartColors
 */
export interface ChartColors {
  /** Colors representing performance levels */
  performance: {
    excellent: string;
    good: string;
    moderate: string;
    poor: string;
  };
  /** UI related chart colors */
  ui: {
    background: string;
    grid: string;
    border: string;
    accent: string;
    dataLine: string;
    shadow: string;
    tooltip: string;
    threshold: string;
  };
  /** Opacity helper values */
  opacity: ChartOpacity;
  /** Helper to apply opacity to a color */
  withOpacity: (color: string, opacity: number) => string;
  /** Get unified gradient colors for area fills */
  getAreaFillGradient: () => string[];
}
