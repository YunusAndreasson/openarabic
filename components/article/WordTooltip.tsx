import { useEffect, useMemo, useCallback, memo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordTooltipProps } from '@/types/ui/modal.types';

// Extract all constants outside component to prevent recreation
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.SMALL,
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  TOOLTIP_HEIGHT: LAYOUT.SPACING.LARGE * 2.2,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.TINY * 1.6,
  PADDING_MULTIPLIER: 1.5,
  Z_INDEX: 999999,
  AUTO_CLOSE_DURATION: LAYOUT.ANIMATION.DURATION.SLOW * 3,
} as const;

// Static animation config to prevent recreation
const ANIMATION_CONFIG = {
  initialOpacity: 0,
  duration: LAYOUT.ANIMATION.DURATION.FAST,
} as const;

// Cache for expensive tooltip positioning calculations
const positioningCache = new Map<
  string,
  {
    wordCenterX: number;
    tooltipTop: number;
    tooltipWidth: number;
    tooltipLeftOffset: number;
    arrowOffset: number;
  }
>();
const CACHE_MAX_SIZE = 50;

// Static styles to prevent recreation
const STATIC_STYLES = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    zIndex: TOOLTIP_CONSTANTS.Z_INDEX,
  },
  absoluteFull: {
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  tooltip: {
    ...LAYOUT.ELEVATION.SUBTLE,
    alignSelf: 'flex-start',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    position: 'absolute',
  },
  arrow: {
    borderStyle: 'solid',
    height: 0,
    left: 0,
    marginLeft: -TOOLTIP_CONSTANTS.ARROW_SIZE / 2,
    position: 'absolute',
    width: 0,
  },
  tooltipText: {
    flexShrink: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
    textAlign: 'center',
  },
});

/**
 * Helper function to create a cache key for positioning calculations
 */
const createPositioningCacheKey = (
  layout: NonNullable<WordTooltipProps['layout']>,
  textLength: number,
  screenWidth: number
): string =>
  `${layout.x}-${layout.y}-${layout.width}-${layout.height}-${textLength}-${screenWidth}`;

/**
 * Helper function to calculate tooltip positioning with caching
 */
const calculateTooltipPositioning = (
  layout: NonNullable<WordTooltipProps['layout']>,
  text: string,
  screenWidth: number
) => {
  const cacheKey = createPositioningCacheKey(layout, text.length, screenWidth);

  if (positioningCache.has(cacheKey)) {
    const cached = positioningCache.get(cacheKey);
    if (cached) return cached;
  }

  const {
    SPACING,
    ARROW_SIZE,
    TOOLTIP_MARGIN,
    TOOLTIP_HEIGHT,
    SCREEN_MARGIN,
    CHAR_WIDTH,
    PADDING_MULTIPLIER,
  } = TOOLTIP_CONSTANTS;

  const wordCenterX = layout.x + layout.width / 2;
  const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - TOOLTIP_HEIGHT;

  let tooltipWidth = Math.max(
    text.length * CHAR_WIDTH + SPACING * PADDING_MULTIPLIER * 2,
    layout.width + SPACING * 2,
    LAYOUT.SPACING.XLARGE
  );

  // Calculate minimum width to prevent word breaking
  const words = text.split(' ');
  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ''
  );

  // Ensure minimum width can fit the longest word with generous padding
  const minWidthForLongestWord = longestWord.length * CHAR_WIDTH * 1.5 + SPACING * 4;

  // Constrain to reasonable screen width but ensure longest word fits
  tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.8);
  tooltipWidth = Math.max(tooltipWidth, minWidthForLongestWord);

  const idealTooltipLeft = wordCenterX - tooltipWidth / 2;
  const idealTooltipRight = wordCenterX + tooltipWidth / 2;

  const leftOverflow = SCREEN_MARGIN - idealTooltipLeft;
  const rightOverflow = idealTooltipRight - (screenWidth - SCREEN_MARGIN);

  let tooltipLeftOffset = idealTooltipLeft;

  if (leftOverflow > 0) {
    tooltipLeftOffset = SCREEN_MARGIN;
  } else if (rightOverflow > 0) {
    tooltipLeftOffset = screenWidth - SCREEN_MARGIN - tooltipWidth;
  }

  const arrowOffset = wordCenterX - tooltipLeftOffset;

  const result = {
    wordCenterX,
    tooltipTop,
    tooltipWidth,
    tooltipLeftOffset,
    arrowOffset,
  };

  // Manage cache size
  if (positioningCache.size >= CACHE_MAX_SIZE) {
    const firstKey = positioningCache.keys().next().value;
    if (firstKey !== undefined) {
      positioningCache.delete(firstKey);
    }
  }

  positioningCache.set(cacheKey, result);
  return result;
};

/**
 * Custom comparison function for WordTooltip memo
 */
const WordTooltipComparison = (
  prevProps: WordTooltipProps,
  nextProps: WordTooltipProps
): boolean => {
  // Compare primitive values
  if (
    prevProps.visible !== nextProps.visible ||
    prevProps.text !== nextProps.text ||
    prevProps.zIndex !== nextProps.zIndex
  ) {
    return false;
  }

  // Compare layout objects (deep comparison)
  const prevLayout = prevProps.layout;
  const nextLayout = nextProps.layout;

  if (prevLayout === null && nextLayout === null) {
    return true;
  }

  if (prevLayout === null || nextLayout === null) {
    return false;
  }

  if (
    prevLayout.x !== nextLayout.x ||
    prevLayout.y !== nextLayout.y ||
    prevLayout.width !== nextLayout.width ||
    prevLayout.height !== nextLayout.height
  ) {
    return false;
  }

  // onClose functions are likely to be stable, but we'll treat as equal
  // if all other props are equal (following React.memo patterns)
  return true;
};

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 * Ensures the arrow tip is precisely centered over the word regardless of screen position
 */
export const WordTooltip = memo(
  ({ visible, text = '', layout, onClose, zIndex }: WordTooltipProps) => {
    const colors = useColors();
    const { width: screenWidth } = useWindowDimensions();

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Setup opacity animation for fade effect with quick timing
    const { fadeIn, animatedStyle: opacityStyle } = useOpacityAnimation(ANIMATION_CONFIG);

    // Memoize colors to prevent unnecessary recalculations
    const tooltipColors = useMemo(
      () => ({
        backgroundColor: colors.elevation3,
        textColor: colors.text,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        transparentColor: colors.transparent,
      }),
      [colors.elevation3, colors.text, colors.border, colors.shadow, colors.transparent]
    );

    // Handle closing the tooltip with animation sequence
    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    // Memoize the tooltip content to reduce re-renders
    const tooltipContent = useMemo(
      () => (
        <ThemedText
          skipDefaultColor
          numberOfLines={2}
          style={[STATIC_STYLES.tooltipText, { color: tooltipColors.textColor }]}
        >
          {text}
        </ThemedText>
      ),
      [text, tooltipColors.textColor]
    );

    // Calculate tooltip position and adjust for screen edges with caching
    const tooltipPositioning = useMemo(() => {
      if (!layout) {
        return {
          wordCenterX: 0,
          tooltipTop: 0,
          tooltipWidth: 100,
          tooltipLeftOffset: 0,
          arrowOffset: 0,
        };
      }

      return calculateTooltipPositioning(layout, text || '', screenWidth);
    }, [layout, text, screenWidth]);

    // Memoize container style
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.absoluteFull,
        ...STATIC_STYLES.tooltipContainer,
        top: tooltipPositioning.tooltipTop,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
      }),
      [tooltipPositioning.tooltipTop, zIndex]
    );

    // Memoize tooltip style
    const tooltipStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltip,
        left: tooltipPositioning.tooltipLeftOffset,
        width: tooltipPositioning.tooltipWidth,
        backgroundColor: tooltipColors.backgroundColor,
        borderColor: tooltipColors.borderColor,
        shadowColor: tooltipColors.shadowColor,
        padding: TOOLTIP_CONSTANTS.SPACING,
      }),
      [
        tooltipPositioning.tooltipLeftOffset,
        tooltipPositioning.tooltipWidth,
        tooltipColors.backgroundColor,
        tooltipColors.borderColor,
        tooltipColors.shadowColor,
      ]
    );

    // Memoize arrow style
    const arrowStyle = useMemo(
      () => ({
        ...STATIC_STYLES.arrow,
        left: tooltipPositioning.arrowOffset,
        borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderTopColor: tooltipColors.backgroundColor,
        bottom: -TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftColor: tooltipColors.transparentColor,
        borderRightColor: tooltipColors.transparentColor,
      }),
      [
        tooltipPositioning.arrowOffset,
        tooltipColors.backgroundColor,
        tooltipColors.transparentColor,
      ]
    );

    // Trigger animations based on visibility
    useEffect(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (visible) {
        fadeIn();

        // Auto-close tooltip after a delay
        timerRef.current = setTimeout(handleClose, TOOLTIP_CONSTANTS.AUTO_CLOSE_DURATION);
      } else {
        handleClose();
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [visible, fadeIn, handleClose]);

    if (!visible || !layout) return null;

    return (
      <Animated.View pointerEvents="none" style={[containerStyle, opacityStyle as ViewStyle]}>
        <View style={tooltipStyle}>
          {tooltipContent}
          <View style={arrowStyle} />
        </View>
      </Animated.View>
    );
  },
  WordTooltipComparison
);

// Add display name to the memoized component
WordTooltip.displayName = 'WordTooltip';
