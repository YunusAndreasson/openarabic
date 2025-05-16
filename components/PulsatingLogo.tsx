import React, { JSX, useEffect, memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { usePulseAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';

interface PulsatingLogoProps {
  size?: number;
  borderWidth?: number;
  style?: ViewStyle;
}

/**
 * A pulsating circle logo component that creates a subtle breathing effect
 */
function PulsatingLogo({ size, borderWidth = 12, style }: PulsatingLogoProps): JSX.Element {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();

  // Calculate responsive size based on screen width if not provided
  const logoSize = size || Math.min(screenWidth * 0.26, 120);

  // Use a gentle pulsing animation
  const { animatedStyle, start } = usePulseAnimation({
    style: 'gentle',
    duration: 3000,
    pulseMagnitude: 1.08,
    type: 'both',
  });

  // Start the animation when the component mounts
  useEffect(() => {
    start();
  }, [start]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.outerCircle,
          animatedStyle,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 2,
            borderWidth,
            borderColor: colors.tint,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  outerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(PulsatingLogo);
