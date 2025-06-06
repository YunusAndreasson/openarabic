import React, { useEffect, useState, memo, useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AnimatedStyleProp } from '@/types/ui/base.types';
import type { MeaningOverlayProps } from '@/types/ui/review.types';

import { ThemedText } from '../../components/ThemedText';
import { LAYOUT } from '../../constants/layout';
import { useOpacityAnimation } from '../../hooks/animations';
import { useColors } from '../../hooks/useColors';

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
    isStruggling = false,
    duration = 150,
    animate = true,
    onClose,
  } = props;

  const colors = useColors();
  const [shouldRender, setShouldRender] = useState(visible);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { animatedStyle, startAnimation, reverseAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: 0,
    duration: animate ? duration : 0,
  });

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Watch for visibility changes
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      startAnimation();
    } else if (shouldRender) {
      reverseAnimation();
      onClose?.();

      cleanup();
      timeoutRef.current = setTimeout(() => setShouldRender(false), animate ? duration + 50 : 0);
    }

    return cleanup;
  }, [
    visible,
    startAnimation,
    reverseAnimation,
    shouldRender,
    duration,
    animate,
    onClose,
    cleanup,
  ]);

  if (!shouldRender) return null;

  // Determine text color based on state
  const textColor = isWarning
    ? colors.error
    : isVague || isStruggling
      ? colors.warning
      : colors.tint;

  const fontSize =
    isWarning || isVague || isStruggling
      ? LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2
      : LAYOUT.TYPOGRAPHY.SCALE.XLARGE;

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: colors.background },
        animatedStyle as AnimatedStyleProp<ViewStyle>,
      ]}
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
