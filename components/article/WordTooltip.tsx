import React, { useEffect, useMemo, useCallback, memo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { WordTooltipProps } from '@/types/ui/modal.types';

// Constants for tooltip sizing and positioning
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.SMALL,
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  TOOLTIP_HEIGHT: LAYOUT.SPACING.LARGE * 2,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.TINY * 1.4, // Base width per character
  PADDING_MULTIPLIER: 1.5, // Extra space multiplier for padding
  Z_INDEX: 999999,
} as const;

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 * Ensures the arrow tip is precisely centered over the word regardless of screen position
 */
export const WordTooltip = memo(
  ({ visible, text = '', layout, onClose, zIndex }: WordTooltipProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();
    const { width: screenWidth } = useWindowDimensions();

    // Setup opacity animation for fade effect with quick timing
    const { fadeIn, animatedStyle: opacityStyle } = useOpacityAnimation({
      initialOpacity: 0,
      duration: LAYOUT.ANIMATION.DURATION.FAST,
    });

    // Handle closing the tooltip with animation sequence
    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    // Trigger animations based on visibility
    useEffect(() => {
      if (visible) {
        fadeIn();

        // Auto-close tooltip after a delay
        const timer = setTimeout(handleClose, LAYOUT.ANIMATION.DURATION.SLOW * 3);
        return () => clearTimeout(timer);
      } else {
        handleClose();
      }
      return () => {};
    }, [visible, fadeIn, handleClose]);

    // Get colors based on theme
    const backgroundColor = isDarkMode ? colors.elevation2 : colors.elevation1;
    const textColor = isDarkMode ? colors.text : colors.textSecondary;
    const borderColor = isDarkMode ? colors.elevation3 : colors.elevation2;

    // Memoize the tooltip content to reduce re-renders
    const tooltipContent = useMemo(
      () => (
        <ThemedText
          style={[styles.tooltipText, { color: textColor }]}
          skipDefaultColor
          adjustsFontSizeToFit
        >
          {text}
        </ThemedText>
      ),
      [text, textColor]
    );

    // Calculate tooltip position and adjust for screen edges
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

      tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.7);

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

      return {
        wordCenterX,
        tooltipTop,
        tooltipWidth,
        tooltipLeftOffset,
        arrowOffset,
      };
    }, [layout, text.length, screenWidth]);

    if (!visible || !layout) return null;

    const { tooltipTop, tooltipWidth, tooltipLeftOffset, arrowOffset } = tooltipPositioning;

    return (
      <Animated.View
        style={[
          styles.tooltipContainer,
          styles.absoluteFull,
          {
            top: tooltipTop,
            zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
          },
          opacityStyle as ViewStyle,
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipLeftOffset,
              width: tooltipWidth,
              backgroundColor,
              borderColor,
              shadowColor: colors.shadow,
              padding: TOOLTIP_CONSTANTS.SPACING,
            },
          ]}
        >
          {tooltipContent}

          <View
            style={[
              styles.arrow,
              {
                left: arrowOffset,
                borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
                borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
                borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
                borderTopColor: backgroundColor,
                bottom: -TOOLTIP_CONSTANTS.ARROW_SIZE,
                borderLeftColor: colors.transparent,
                borderRightColor: colors.transparent,
              },
            ]}
          />
        </View>
      </Animated.View>
    );
  }
);

// Add display name to the memoized component
WordTooltip.displayName = 'WordTooltip';

const styles = StyleSheet.create({
  absoluteFull: {
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  arrow: {
    borderStyle: 'solid',
    height: 0,
    left: 0,
    marginLeft: -TOOLTIP_CONSTANTS.ARROW_SIZE / 2,
    position: 'absolute',
    width: 0,
  },
  tooltip: {
    alignSelf: 'flex-start',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: LAYOUT.OPACITY.LIGHT,
        shadowRadius: 2,
      },
      android: {
        elevation: LAYOUT.ELEVATION.SUBTLE,
      },
    }),
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: TOOLTIP_CONSTANTS.Z_INDEX,
  },
  tooltipText: {
    flexShrink: 1,
    flexWrap: 'nowrap',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textAlign: 'center',
  },
});
