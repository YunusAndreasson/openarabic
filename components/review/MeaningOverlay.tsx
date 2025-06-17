import { useEffect, useState, memo, useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { MeaningOverlayProps } from '@/types/ui/review.types';

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
    duration = TIMING_CONFIG.FAST.duration,
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
    <Animated.View style={[styles.overlay, { backgroundColor: colors.elevation0 }, animatedStyle]}>
      <ThemedText
        skipDefaultColor
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: fontSize,
          },
        ]}
      >
        {meaning || STRINGS.NO_TRANSLATION_AVAILABLE}
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
