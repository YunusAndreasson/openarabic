import React, { useEffect } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import Animated from 'react-native-reanimated';
import { usePulseAnimation } from '@/hooks/animations';

interface AnimatedThemedTextProps {
  /** Text content to display */
  children: React.ReactNode;
  /** Style for the text */
  style?: StyleProp<TextStyle>;
  /** Whether to animate when the content changes */
  animate?: boolean;
  /** Animation magnitude (how much to scale) */
  magnitude?: number;
  /** Any additional ThemedText props */
  [key: string]: any;
}

/**
 * AnimatedThemedText combines ThemedText with animation capabilities.
 * It provides a convenient way to create text that animates on changes
 * while maintaining the theming system.
 */
export function AnimatedThemedText({
  children,
  style,
  animate = false,
  magnitude = 1.05,
  ...rest
}: AnimatedThemedTextProps) {
  const { animatedStyle, pulse } = usePulseAnimation(magnitude);

  // Trigger animation when children or animate prop changes
  useEffect(() => {
    if (animate) {
      pulse();
    }
  }, [children, animate, pulse]);

  return (
    <Animated.View style={animate ? animatedStyle : undefined}>
      <ThemedText style={style} {...rest}>
        {children}
      </ThemedText>
    </Animated.View>
  );
}

export default React.memo(AnimatedThemedText);
