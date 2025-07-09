import type { JSX } from 'react';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/theme/useColors';

interface ProgressCircleProps {
  percentage: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  style?: object;
}

const DEFAULT_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 2;

export function ProgressCircle({
  percentage,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  showPercentage = false,
  style,
}: ProgressCircleProps): JSX.Element {
  const colors = useColors();

  // Ensure percentage is between 0-100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Calculate SVG circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;

  // Calculate stroke dash offset for clockwise progress starting from top
  // SVG circles start at 3 o'clock (right), so we need to rotate -90 degrees
  // and calculate the remaining circumference
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    },
    svg: {
      transform: [{ rotate: '-90deg' }], // Rotate to start from top (12 o'clock)
    },
    percentageText: {
      fontSize: size * 0.25, // Scale text with circle size
      fontWeight: '600',
      textAlign: 'center',
      position: 'absolute',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {/* SVG Progress Circle */}
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.textTertiary}
          strokeWidth={strokeWidth}
          strokeOpacity={0.4}
          fill="transparent"
        />

        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.tint}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </Svg>

      {showPercentage && (
        <ThemedText colorName="text" style={styles.percentageText} type="caption" weight="semibold">
          {Math.round(clampedPercentage)}%
        </ThemedText>
      )}
    </View>
  );
}
