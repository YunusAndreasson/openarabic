import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { CACHE_SIZE } from '@/constants/performance';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { MeaningOverlayProps } from '@/types/ui/review.types';

// ===== STATIC CONSTANTS EXTRACTION (CRITICAL FOR PERFORMANCE) =====
const MEANING_OVERLAY_CONSTANTS = {
  HEIGHT_MULTIPLIER: 5,
  LINE_HEIGHT_MULTIPLIER: 1.4,
  CLEANUP_DELAY: 50,
  DEFAULT_DURATION: TIMING_CONFIG.FAST.duration,
  DEFAULT_HEIGHT: LAYOUT.BUTTON.HEIGHT.LARGE * 5 + LAYOUT.SPACING.MEDIUM,
  FONT_SIZE_SPECIAL: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + LAYOUT.SPACING.TINY, // 20 + 4 = 24px - consistent increase
  FONT_SIZE_DEFAULT: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
} as const;

// Static animation configuration
const ANIMATION_CONFIG = {
  FAST_DURATION: TIMING_CONFIG.FAST.duration,
  DEFAULT_DELAY: 0,
} as const;

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
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

// ===== HELPER FUNCTIONS EXTRACTED (PURE FUNCTIONS OUTSIDE COMPONENT) =====
const determineTextColor = (
  isWarning: boolean,
  isVague: boolean,
  isStruggling: boolean,
  colors: ReturnType<typeof useColors>
): string => {
  if (isWarning) return colors.warning;
  if (isVague) return colors.warning;
  if (isStruggling) return colors.error;
  return colors.text;
};

const calculateFontSize = (isWarning: boolean, isVague: boolean, isStruggling: boolean): number => {
  if (isWarning || isVague || isStruggling) {
    return MEANING_OVERLAY_CONSTANTS.FONT_SIZE_SPECIAL;
  }
  return MEANING_OVERLAY_CONSTANTS.FONT_SIZE_DEFAULT;
};

// ===== CACHE MANAGEMENT FOR PERFORMANCE =====
const clearOldestCacheEntry = (cache: Map<string, TextStyle>): void => {
  const firstKey = cache.keys().next().value;
  if (firstKey !== undefined) {
    cache.delete(firstKey);
  }
};

// Module-level cache for style calculations
const textStyleCache = new Map<string, TextStyle>();
const CACHE_MAX_SIZE = CACHE_SIZE.SMALL; // LRU management

const getCachedTextStyle = (textColor: string, fontSize: number): TextStyle => {
  const cacheKey = `${textColor}-${fontSize}`;

  const cached = textStyleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = {
    ...STATIC_STYLES.text,
    color: textColor,
    fontSize: fontSize,
  };

  // Manage cache size (LRU-style)
  if (textStyleCache.size >= CACHE_MAX_SIZE) {
    clearOldestCacheEntry(textStyleCache);
  }

  textStyleCache.set(cacheKey, result);
  return result;
};

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

  // ===== MEMOIZED CALCULATIONS (PREVENT EXPENSIVE RECALCULATIONS) =====
  const textColor = useMemo(
    () => determineTextColor(isWarning, isVague, isStruggling, colors),
    [isWarning, isVague, isStruggling, colors]
  );

  const fontSize = useMemo(
    () => calculateFontSize(isWarning, isVague, isStruggling),
    [isWarning, isVague, isStruggling]
  );

  // ===== ADVANCED STYLE MEMOIZATION =====
  const overlayStyle = useMemo(
    () => [STATIC_STYLES.overlay, { backgroundColor: colors.elevation0 }],
    [colors.elevation0]
  );

  const textStyle = useMemo(() => getCachedTextStyle(textColor, fontSize), [textColor, fontSize]);

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

  return (
    <Animated.View style={[overlayStyle, animatedStyle]}>
      <ThemedText skipDefaultColor style={textStyle}>
        {meaning || STRINGS.NO_TRANSLATION_AVAILABLE}
      </ThemedText>
    </Animated.View>
  );
};

// ===== CUSTOM MEMO COMPARISON FUNCTION (PREVENTS UNNECESSARY RE-RENDERS) =====
const MeaningOverlayComparison = (
  prevProps: MeaningOverlayProps,
  nextProps: MeaningOverlayProps
): boolean => {
  // Compare primitive values first (fastest)
  if (prevProps.visible !== nextProps.visible) return false;
  if (prevProps.meaning !== nextProps.meaning) return false;
  if (prevProps.isWarning !== nextProps.isWarning) return false;
  if (prevProps.isVague !== nextProps.isVague) return false;
  if (prevProps.isStruggling !== nextProps.isStruggling) return false;
  if (prevProps.duration !== nextProps.duration) return false;
  if (prevProps.animate !== nextProps.animate) return false;

  // Function reference comparison
  if (prevProps.onClose !== nextProps.onClose) return false;

  return true;
};

export const MeaningOverlay = memo(MeaningOverlayInternal, MeaningOverlayComparison);

MeaningOverlay.displayName = 'MeaningOverlay';

export default MeaningOverlay;
