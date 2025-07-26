import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { MeaningOverlayProps } from '@/types/ui/review.types';
import {
  calculateFontSize,
  createMeaningOverlayTextStyle,
  determineTextColor,
  type MeaningOverlayColors,
} from '@/utils/textStyleUtils';

const MEANING_OVERLAY_CONSTANTS = {
  HEIGHT_MULTIPLIER: 5,
  LINE_HEIGHT_MULTIPLIER: 1.4,
  CLEANUP_DELAY: 50,
  DEFAULT_DURATION: TIMING_CONFIG.FAST.duration,
  DEFAULT_HEIGHT: LAYOUT.BUTTON.HEIGHT.LARGE * 5 + LAYOUT.SPACING.MEDIUM,
} as const;

// Static animation configuration
const ANIMATION_CONFIG = {
  FAST_DURATION: TIMING_CONFIG.FAST.duration,
  DEFAULT_DELAY: 0,
} as const;

const STATIC_STYLES = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    alignSelf: 'center',
    height:
      LAYOUT.BUTTON.HEIGHT.LARGE * MEANING_OVERLAY_CONSTANTS.HEIGHT_MULTIPLIER +
      LAYOUT.SPACING.MEDIUM,
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * MEANING_OVERLAY_CONSTANTS.LINE_HEIGHT_MULTIPLIER,
    padding: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
  },
});

/**
 * Component that displays the meaning of a word with a fade animation
 * without changing the background brightness
 */
const MeaningOverlayInternal = (props: MeaningOverlayProps) => {
  const {
    visible,
    meaning,
    isWarning = false,
    isVague = false,
    isStruggling = false,
    duration = MEANING_OVERLAY_CONSTANTS.DEFAULT_DURATION,
    animate = true,
    onClose,
  } = props;

  const colors = useColors();
  const [shouldRender, setShouldRender] = useState(visible);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ===== COLOR BATCHING (PREVENTS MULTIPLE COLOR CALCULATIONS) =====
  const batchedColors = useMemo(
    (): MeaningOverlayColors => ({
      warning: colors.warning,
      error: colors.error,
      text: colors.text,
    }),
    [colors.warning, colors.error, colors.text]
  );

  const textColor = useMemo(
    () => determineTextColor(isWarning, isVague, isStruggling, batchedColors),
    [isWarning, isVague, isStruggling, batchedColors]
  );

  const fontSize = useMemo(
    () => calculateFontSize(isWarning, isVague, isStruggling),
    [isWarning, isVague, isStruggling]
  );

  const overlayStyle = useMemo(
    () => [STATIC_STYLES.overlay, { backgroundColor: colors.elevation0 }],
    [colors.elevation0]
  );

  const textStyle = useMemo(
    () => createMeaningOverlayTextStyle(textColor, fontSize, STATIC_STYLES.text),
    [textColor, fontSize]
  );

  // ===== OPTIMIZED ANIMATION HANDLING =====
  const { animatedStyle, startAnimation, reverseAnimation } = useOpacityAnimation({
    initialOpacity: 0,
    delay: ANIMATION_CONFIG.DEFAULT_DELAY,
    duration: animate ? duration : 0,
  });

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Watch for visibility changes - optimized effect dependencies
  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      startAnimation();
    } else if (shouldRender) {
      reverseAnimation();
      onClose?.();

      cleanup();
      timeoutRef.current = setTimeout(
        () => setShouldRender(false),
        animate ? duration + MEANING_OVERLAY_CONSTANTS.CLEANUP_DELAY : 0
      );
    }
  }, [
    visible,
    shouldRender,
    startAnimation,
    reverseAnimation,
    onClose,
    cleanup,
    animate,
    duration,
  ]);

  // ===== CLEANUP ON UNMOUNT =====
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View style={[overlayStyle, animatedStyle]}>
      <ThemedText style={textStyle} numberOfLines={3}>
        {meaning || STRINGS.NO_TRANSLATION_AVAILABLE}
      </ThemedText>
    </Animated.View>
  );
};

// ===== OPTIMIZED COMPARISON FUNCTION (PREVENT UNNECESSARY RE-RENDERS) =====
const MeaningOverlayComparison = (
  prevProps: MeaningOverlayProps,
  nextProps: MeaningOverlayProps
): boolean => {
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.meaning === nextProps.meaning &&
    prevProps.isWarning === nextProps.isWarning &&
    prevProps.isVague === nextProps.isVague &&
    prevProps.isStruggling === nextProps.isStruggling &&
    prevProps.duration === nextProps.duration &&
    prevProps.animate === nextProps.animate &&
    prevProps.onClose === nextProps.onClose
  );
};

export const MeaningOverlay = memo(MeaningOverlayInternal, MeaningOverlayComparison);

export default MeaningOverlay;
