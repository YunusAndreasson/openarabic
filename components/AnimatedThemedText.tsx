import React, { useCallback, useEffect } from 'react';
import { Animated as RNAnimated, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedTextProps } from '@/types/ui.types';
import { StyleProp, TextStyle } from 'react-native';
import { AnimatedStyle } from 'react-native-reanimated';
import { usePulseAnimation } from '@/hooks/animations';

/**
 * AnimatedText combines ThemedText with animation capabilities.
 * It provides a convenient way to create text that animates on changes
 * while maintaining the theming system.
 *
 * NOTE: This is the recommended way to animate text content as it properly
 * separates animation styling from typography styling.
 */
interface AnimatedTextProps extends ThemedTextProps {
  /** Whether to animate when the content changes */
  animate?: boolean;
  /** Animation magnitude (how much to scale) */
  magnitude?: number;
  /** Style for the animated container view */
  animatedViewStyle?: StyleProp<AnimatedStyle<any>>;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  style,
  animate = false,
  magnitude = 1.2,
  animatedViewStyle,
  ...rest
}) => {
  const { animatedStyle, startAnimation } = usePulseAnimation({
    style: 'standard',
    pulseMagnitude: magnitude,
  });

  useEffect(() => {
    if (animate) {
      startAnimation();
    }
  }, [children, animate, startAnimation]);

  return (
    <RNAnimated.View style={[animatedStyle, animatedViewStyle]}>
      <ThemedText {...rest} style={style}>
        {children}
      </ThemedText>
    </RNAnimated.View>
  );
};

// For backward compatibility
export const AnimatedThemedText = AnimatedText;

export default AnimatedText;
