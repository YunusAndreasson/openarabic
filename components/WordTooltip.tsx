import React, { useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Platform, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { useColors } from '../hooks/useColors';
import { WordTooltipProps } from '@/types/ui/modal.types';
import Animated from 'react-native-reanimated';
import { useTransformAnimation, useOpacityAnimation } from '@/hooks/animations';

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 * Ensures the arrow tip is precisely centered over the word regardless of screen position
 */
export const WordTooltip = React.memo(
  ({ visible, text = '', layout, onClose }: WordTooltipProps) => {
    const isDarkMode = useIsDarkMode();
    const colors = useColors();

    // Setup transform animation for scale effect
    const {
      startAnimation: startScaleAnimation,
      reverseAnimation: reverseScaleAnimation,
      animatedStyle: transformStyle,
    } = useTransformAnimation({
      type: 'scale',
      initialValue: 0.94, // Slightly larger starting scale for more subtle effect
      targetValue: 1,
      duration: LAYOUT.ANIMATION.DURATION.NORMAL / 7, // Slightly faster animation
      useSpring: true,
    });

    // Setup opacity animation for subtle fade effect
    const {
      fadeIn,
      fadeOut,
      animatedStyle: opacityStyle,
    } = useOpacityAnimation({
      initialOpacity: 0.7, // Start more visible for faster appearance
      duration: LAYOUT.ANIMATION.DURATION.NORMAL / 10,
    });

    // Handle closing the tooltip with animation sequence
    const handleClose = useCallback(() => {
      fadeOut(() => {
        reverseScaleAnimation(onClose);
      });
    }, [fadeOut, reverseScaleAnimation, onClose]);

    // Trigger animations based on visibility
    useEffect(() => {
      if (visible) {
        // Start both animations
        startScaleAnimation();
        fadeIn();

        // Auto-close tooltip after standardized delay
        const timer = setTimeout(() => {
          handleClose();
        }, LAYOUT.ANIMATION.DURATION.SLOW * 3); // Increased duration by 3x

        return () => clearTimeout(timer);
      } else {
        handleClose();
        return () => {}; // Empty cleanup for else path
      }
    }, [visible, startScaleAnimation, fadeIn, handleClose]);

    // Get colors based on theme - using colors from Colors.ts
    const backgroundColor = isDarkMode ? colors.elevation2 : colors.elevation1;
    const textColor = isDarkMode
      ? colors.text // dark theme text
      : colors.textSecondary; // More subtle text color for better contrast
    const borderColor = isDarkMode
      ? colors.elevation3 // slightly lighter border for dark mode
      : colors.elevation2; // slightly darker border for light mode

    // Size and position calculations
    const { width: screenWidth } = Dimensions.get('window');

    // Harmonious spacing values
    const SPACING = LAYOUT.SPACING.SMALL; // Consistent spacing for harmony
    const ARROW_SIZE = 5; // Arrow size
    const TOOLTIP_MARGIN = SPACING; // Gap between word and tooltip (same as internal padding)
    const TOOLTIP_HEIGHT = 30; // Slightly reduced height for tighter appearance
    const SCREEN_MARGIN = 16; // Margin from screen edges

    // Character width multipliers for width calculation
    const CHAR_WIDTH = 5.5; // Base width per character
    const PADDING_MULTIPLIER = 1.6; // Extra space multiplier for padding

    // Memoize the tooltip content to reduce re-renders
    const tooltipContent = useMemo(() => {
      return (
        <ThemedText
          style={[styles.tooltipText, { color: textColor }]}
          skipDefaultColor
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {text}
        </ThemedText>
      );
    }, [text, textColor]);

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

      // Calculate initial position values based on word layout
      const wordCenterX = layout.x + layout.width / 2;
      const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - TOOLTIP_HEIGHT;

      // Calculate width based on content length - tighter around the text
      const textLength = text.length;
      let tooltipWidth = Math.max(
        // Base on character count with some padding
        textLength * CHAR_WIDTH + SPACING * PADDING_MULTIPLIER * 2,
        // Ensure it's at least as wide as the word + some padding
        layout.width + SPACING * 2,
        // Absolute minimum width
        70
      );

      // Cap maximum width
      tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.5);

      // Calculate potential tooltip edges based on centered position
      const idealTooltipLeft = wordCenterX - tooltipWidth / 2;
      const idealTooltipRight = wordCenterX + tooltipWidth / 2;

      // Check if tooltip would extend beyond screen edges
      const leftOverflow = SCREEN_MARGIN - idealTooltipLeft;
      const rightOverflow = idealTooltipRight - (screenWidth - SCREEN_MARGIN);

      // Determine final tooltip position, adjusting if needed to keep on screen
      let tooltipLeftOffset = idealTooltipLeft;

      if (leftOverflow > 0) {
        // Tooltip would go off left edge, move it right
        tooltipLeftOffset = SCREEN_MARGIN;
      } else if (rightOverflow > 0) {
        // Tooltip would go off right edge, move it left
        tooltipLeftOffset = screenWidth - SCREEN_MARGIN - tooltipWidth;
      }

      // Calculate exact arrow offset from tooltip left edge
      // This ensures the arrow is perfectly centered over the word regardless of tooltip position
      const arrowOffset = wordCenterX - tooltipLeftOffset;

      return {
        wordCenterX,
        tooltipTop,
        tooltipWidth,
        tooltipLeftOffset,
        arrowOffset,
      };
    }, [
      layout,
      text,
      SPACING,
      ARROW_SIZE,
      TOOLTIP_HEIGHT,
      TOOLTIP_MARGIN,
      CHAR_WIDTH,
      PADDING_MULTIPLIER,
      SCREEN_MARGIN,
      screenWidth,
    ]);

    // Don't render anything if tooltip shouldn't be visible or has no layout
    if (!visible || !layout) return null;

    const { tooltipTop, tooltipWidth, tooltipLeftOffset, arrowOffset } = tooltipPositioning;

    return (
      <Animated.View
        style={[
          styles.tooltipContainer,
          styles.absoluteFull,
          { top: tooltipTop },
          transformStyle as unknown as ViewStyle,
          opacityStyle as unknown as ViewStyle,
        ]}
        pointerEvents="none"
      >
        {/* Tooltip positioned absolutely with fixed left offset */}
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipLeftOffset,
              width: tooltipWidth,
              backgroundColor,
              borderColor,
              shadowColor: colors.shadow,
              padding: SPACING, // Equal spacing in all directions
            },
          ]}
        >
          {tooltipContent}

          {/* Arrow pointing to the word - absolute positioning from tooltip left */}
          <View
            style={[
              styles.arrow,
              {
                left: arrowOffset, // Absolute position relative to the tooltip's left edge
                borderTopWidth: ARROW_SIZE,
                borderLeftWidth: ARROW_SIZE,
                borderRightWidth: ARROW_SIZE,
                borderTopColor: backgroundColor,
                bottom: -ARROW_SIZE, // Exact positioning at the bottom
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
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 999999, // Ensure tooltips are always on top
  },
  tooltip: {
    position: 'absolute',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tooltipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2, // Compact line height
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    marginLeft: -2.5, // Half of arrow size for perfect centering
    borderStyle: 'solid',
  },
});
