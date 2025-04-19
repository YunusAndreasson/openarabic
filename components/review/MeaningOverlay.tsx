import React, { useEffect, useState, useRef, memo } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProps } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import type { MeaningOverlayProps } from '@/types/ui/review.types';

import { ThemedText } from '../../components/ThemedText';
import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation } from '../../hooks/animations';
import { useColors } from '../../hooks/useColors';
import { lightFeedback } from '../../utils/haptics';

/**
 * Component that displays the meaning of a word with a fade animation
 * without changing the background brightness
 */
const MeaningOverlay = memo((props: MeaningOverlayProps) => {
  const {
    visible,
    meaning,
    isWarning = false,
    isVague = false,
    duration = 150,
    animate = true,
    onClose,
  } = props;

  const colors = useColors();
  const [shouldRender, setShouldRender] = useState(visible);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { animatedStyle, startAnimation, reverseAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: 0,
    duration: animate ? duration : 0,
  });

  // Watch for visibility changes
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      startAnimation();

      if (isWarning || isVague) {
        lightFeedback();
      }
      return () => {};
    } else if (shouldRender) {
      reverseAnimation();
      onClose?.();

      const timeout = setTimeout(
        () => {
          if (isMountedRef.current) {
            setShouldRender(false);
          }
        },
        animate ? duration + 50 : 0
      );

      return () => clearTimeout(timeout);
    }
    return () => {};
  }, [
    visible,
    startAnimation,
    reverseAnimation,
    isWarning,
    isVague,
    shouldRender,
    duration,
    animate,
    onClose,
  ]);

  if (!shouldRender) return null;

  // Determine text color based on state
  let textColor;
  if (isWarning) {
    textColor = colors.error;
  } else if (isVague) {
    textColor = colors.warning; // Use orange/yellow for vague
  } else {
    textColor = colors.tint;
  }

  const fontSize =
    isWarning || isVague ? LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2 : LAYOUT.TYPOGRAPHY.SCALE.XLARGE;

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: colors.background }, animatedStyle as StyleProps]}
    >
      <ThemedText
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: fontSize,
          },
        ]}
        skipDefaultColor
      >
        {meaning || 'No translation available'}
      </ThemedText>
    </Animated.View>
  );
});

// Use separate style objects for view and text styles to avoid TypeScript errors
const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    alignSelf: 'center',
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 5 + LAYOUT.SPACING.MEDIUM,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.XLARGE,
    position: 'absolute',
    right: 0,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  text: {
    fontWeight: '700',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.4,
    padding: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
});

export default MeaningOverlay;
MeaningOverlay.displayName = 'MeaningOverlay';
