import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { ThemedTextProps } from '../types/ui.types';

/**
 * AnimatedText combines ThemedText with animation capabilities.
 * It provides a component that properly handles animation styles with text styling
 * by separating the animation styles (applied to the container View)
 * from the text styles (applied to ThemedText).
 */
export interface AnimatedTextProps extends ThemedTextProps {
  /** Animated style to apply to the container View */
  animatedViewStyle?: StyleProp<ViewStyle>;
}

/**
 * AnimatedText component that properly handles both animation and typography
 */
export const AnimatedText = React.memo(
  ({
    children,
    style,
    animatedViewStyle,
    type = 'body',
    variant,
    weight,
    align,
    colorName,
    skipDefaultColor,
    numberOfLines,
    ellipsizeMode,
    arabicFontSize,
    ...rest
  }: AnimatedTextProps) => {
    return (
      <Animated.View style={animatedViewStyle}>
        <ThemedText
          style={style}
          type={type}
          variant={variant}
          weight={weight}
          align={align}
          colorName={colorName}
          skipDefaultColor={skipDefaultColor}
          numberOfLines={numberOfLines}
          ellipsizeMode={ellipsizeMode}
          arabicFontSize={arabicFontSize}
          {...rest}
        >
          {children}
        </ThemedText>
      </Animated.View>
    );
  }
);

AnimatedText.displayName = 'AnimatedText';

export default AnimatedText;
