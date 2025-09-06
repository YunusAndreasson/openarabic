import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
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

// Smooth color interpolation between red, orange, and green
const interpolateColor = (percentage: number, colors: ThemeColors): string => {
  if (percentage <= 50) {
    // Interpolate from red to orange (0-50%)
    const ratio = percentage / 50;
    return interpolateHexColors(colors.error, colors.warning, ratio);
  } else {
    // Interpolate from orange to green (50-100%)
    const ratio = (percentage - 50) / 50;
    return interpolateHexColors(colors.warning, colors.success, ratio);
  }
};

// Helper function to interpolate between two hex colors
const interpolateHexColors = (color1: string, color2: string, ratio: number): string => {
  // Convert hex to RGB
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  // Interpolate each channel
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
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
