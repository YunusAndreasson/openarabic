import React, { useEffect, useState } from 'react';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText } from '../../components/ThemedText';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation } from '../../hooks/animations';
import { lightFeedback } from '../../utils/haptics';
import { MeaningOverlayProps } from '../../types/ui.types';

/**
 * Component that displays the meaning of a word with a fade animation
 * without changing the background brightness
 */
const MeaningOverlay: React.FC<MeaningOverlayProps> = React.memo(
  ({ visible, meaning, isWarning = false }) => {
    const colors = useColors();
    // Add internal state to track if we should render anything
    const [shouldRender, setShouldRender] = useState(visible);

    const { animatedStyle, startAnimation, reverseAnimation } = useOpacityAnimation({
      initialOpacity: 0,
      delay: 0,
      duration: 150,
    });

    // Watch for visibility changes
    useEffect(() => {
      if (visible) {
        // When becoming visible, render immediately and animate in
        setShouldRender(true);
        startAnimation();

        // Provide haptic feedback when showing a warning
        if (isWarning) {
          lightFeedback();
        }
      } else if (shouldRender) {
        // When hiding, animate out first, then stop rendering
        reverseAnimation();

        // Wait for animation to complete before unmounting
        const timeout = setTimeout(() => {
          setShouldRender(false);
        }, 200); // slightly longer than animation duration

        return () => clearTimeout(timeout);
      }
    }, [visible, startAnimation, reverseAnimation, isWarning, shouldRender]);

    // Don't render anything if we shouldn't render
    if (!shouldRender) return null;

    // Use warning color and larger font size when isWarning is true
    const textColor = isWarning ? colors.warning : colors.tint;
    const fontSize = isWarning
      ? LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2
      : LAYOUT.TYPOGRAPHY.SCALE.XLARGE;

    return (
      <Animated.View
        style={[styles.overlay, { backgroundColor: colors.background }, animatedStyle]}
      >
        <ThemedText
          style={[
            styles.text,
            {
              color: textColor,
              fontSize: fontSize,
            } as TextStyle,
          ]}
          skipDefaultColor
        >
          {meaning || 'No translation available'}
        </ThemedText>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 1000,
    left: 0,
    right: 0,
    height: 280, // Match the height of the word container
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
    alignSelf: 'center',
  } as ViewStyle,
  text: {
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.4,
    padding: LAYOUT.SPACING.LARGE,
  } as TextStyle,
});

export default MeaningOverlay;
