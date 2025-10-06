import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { formatHex, interpolate } from 'culori';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/theme/useColors';
import type { ThemeColors } from '@/types/ui/theme.types';

interface DifficultyBarProps {
  difficulty: number;
  width?: number;
  height?: number;
}

// Calculate difficulty percentage (0-100) for bar fill
// Higher difficulty = more filled bar (more challenging = more work needed)
// Lower difficulty = less filled bar (mastered = less work needed)
const getDifficultyPercentage = (difficulty: number): number => {
  // Invert the scale: 1.0 (mastered) = 100%, 10.0 (struggling) = 0%
  // This makes more sense UX-wise: full bar = accomplishment
  return Math.max(0, Math.min(100, ((10.0 - difficulty) / 9.0) * 100));
};

// Smooth color interpolation between red, orange, and green using OKLCH for perceptually uniform transitions
const interpolateColor = (percentage: number, colors: ThemeColors): string => {
  // Create a single interpolator across the full spectrum (error -> warning -> success)
  const colorInterpolator = interpolate([colors.error, colors.warning, colors.success], 'oklch');

  // Map percentage (0-100) to interpolation position (0-1)
  const position = percentage / 100;

  // Get interpolated color and convert to hex
  const interpolatedColor = colorInterpolator(position);
  return formatHex(interpolatedColor);
};

export const DifficultyBar = React.memo<DifficultyBarProps>(
  ({ difficulty, width = 64, height = 8 }) => {
    const colors = useColors();

    // Memoize calculations for performance
    const { barWidth, barColor } = useMemo(() => {
      const percentage = getDifficultyPercentage(difficulty);
      const barWidth = (percentage / 100) * width;

      // Smooth color interpolation based on percentage
      // 0% = red, 50% = orange, 100% = green
      const barColor = interpolateColor(percentage, colors);

      return { barWidth, barColor };
    }, [difficulty, width, colors]);

    // Don't render if difficulty is invalid or colors are not available
    if (
      difficulty < 1.0 ||
      difficulty > 10.0 ||
      !colors.error ||
      !colors.warning ||
      !colors.success
    ) {
      return null;
    }

    return (
      <View style={[styles.container, { width, height }]}>
        {/* Background track showing full progress range */}
        <View style={[styles.track, { backgroundColor: colors.elevation2 }]}>
          {/* Full gradient background showing the complete spectrum */}
          <Canvas style={[styles.backgroundCanvas, { width, height }]}>
            <RoundedRect x={0} y={0} width={width} height={height} r={height / 2}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(width, 0)}
                colors={[colors.error, colors.warning, colors.success]}
                positions={[0, 0.5, 1]}
              />
            </RoundedRect>
          </Canvas>
        </View>

        {/* Skia canvas for the animated difficulty bar */}
        <Canvas style={[styles.canvas, { width, height }]}>
          {/* Difficulty bar with solid color */}
          <RoundedRect
            x={0}
            y={0}
            width={barWidth}
            height={height}
            r={height / 2}
            color={barColor}
          />
        </Canvas>
      </View>
    );
  }
);

DifficultyBar.displayName = 'DifficultyBar';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 2,
    opacity: 0.3,
  },
  backgroundCanvas: {
    position: 'absolute',
    opacity: 0.4,
  },
  canvas: {
    position: 'absolute',
  },
});
