import { Line, vec } from 'react-native-skia';
import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

interface ChartBaselineProps {
  /** Plot width — the line spans it exactly. */
  width: number;
  /** y of the baseline, i.e. the plot's own height. */
  y: number;
  color: string;
}

/**
 * The rule a chart's marks stand on.
 *
 * Three charts drew this themselves and two of them agreed. `ChartGrid` used
 * `strokeWidth={1}` under a comment calling it "the same hairline weight as the
 * grid", while the two practice canvases used `StyleSheet.hairlineWidth` — which
 * is a real hairline (1 / PixelRatio), two to three times finer. So the shared
 * chart stack drew a visibly heavier floor than the sparklines beside it, and
 * the comment saying otherwise is why nobody noticed.
 *
 * `hairlineWidth` wins: it is the value the two charts on the practice screen
 * were tuned against, and it is what "hairline" means everywhere else in the app.
 */
export function ChartBaseline({ width, y, color }: ChartBaselineProps): JSX.Element {
  return (
    <Line
      p1={vec(0, y)}
      p2={vec(width, y)}
      color={color}
      strokeWidth={StyleSheet.hairlineWidth}
      style="stroke"
    />
  );
}

ChartBaseline.displayName = 'ChartBaseline';
