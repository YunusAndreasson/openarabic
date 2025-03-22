import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Platform, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { TIMING } from '../constants/ui';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { useColors } from '../hooks/useColors';
import { WordTooltipProps } from '@/types/ui.types';
import Animated from 'react-native-reanimated';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 */
export const WordTooltip = React.memo(({ visible, text, layout, onClose }: WordTooltipProps) => {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();

  // Setup fade animation
  const {
    fadeIn,
    fadeOut,
    animatedStyle: opacityStyle,
  } = useOpacityAnimation({
    initialOpacity: 0,
    duration: TIMING.INTERACTION.TOOLTIP_DURATION / 6, // Animation should be quick
    style: 'standard',
  });

  // Setup transform animation (slide up effect)
  const {
    startAnimation,
    reverseAnimation,
    animatedStyle: transformStyle,
  } = useTransformAnimation({
    type: 'scale',
    initialValue: 0.95,
    targetValue: 1,
    duration: TIMING.INTERACTION.TOOLTIP_DURATION / 6,
    useSpring: true, // Use spring for more natural motion
  });

  // Trigger animation based on visibility
  useEffect(() => {
    if (visible) {
      // Start both animations
      fadeIn();
      startAnimation();

      // Auto-close tooltip after standardized delay
      const timer = setTimeout(() => {
        // Start fade out and reverse animations, then call onClose when complete
        fadeOut(() => {
          reverseAnimation();
          onClose();
        });
      }, TIMING.INTERACTION.TOOLTIP_DURATION - 150); // Leave time for fade out

      return () => clearTimeout(timer);
    } else {
      fadeOut();
      reverseAnimation();
    }
  }, [visible, fadeIn, fadeOut, startAnimation, reverseAnimation, onClose]);

  // Get colors based on theme
  const backgroundColor = isDarkMode
    ? colors.cardBackground // dark theme background
    : colors.white; // light theme background
  const textColor = isDarkMode
    ? colors.text // dark theme text
    : colors.titleText; // light theme text
  const borderColor = isDarkMode
    ? colors.cardBorder // dark theme border
    : colors.cardBorder; // light theme border
  const transparent = 'transparent'; // For linter compliance

  // Size and position calculations for layout (these calculations are safe even if layout is null)
  const { width: screenWidth } = Dimensions.get('window');
  const MAX_TOOLTIP_WIDTH = screenWidth * 0.7; // Maximum 70% of screen width
  const ARROW_SIZE = 8;
  const TOOLTIP_MARGIN = 10;

  // Memoize the tooltip content to reduce re-renders
  const tooltipContent = useMemo(
    () => (
      <ThemedText
        style={[styles.tooltipText, { color: textColor }]}
        skipDefaultColor
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {text}
      </ThemedText>
    ),
    [text, textColor]
  );

  // Memoize the arrow component to reduce re-renders
  const arrowComponent = useMemo(
    () => (
      <View
        style={[
          styles.arrow,
          {
            borderTopColor: backgroundColor,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderTopWidth: ARROW_SIZE,
            borderLeftColor: transparent,
            borderRightColor: transparent,
          },
        ]}
      />
    ),
    [backgroundColor, ARROW_SIZE, transparent]
  );

  // Don't render anything if tooltip shouldn't be visible or has no layout
  if (!visible || !layout) return null;

  // Calculate position values based on layout
  const wordCenterX = layout.x + layout.width / 2;
  const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - 30; // Increased height for better visibility

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        {
          top: tooltipTop,
          width: '100%',
          alignItems: 'center',
        },
        opacityStyle as unknown as ViewStyle, // Apply fade animation
        transformStyle as unknown as ViewStyle, // Apply transform animation
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.tooltipWrapper,
          {
            left: wordCenterX,
          },
        ]}
      >
        <View
          style={[
            styles.tooltip,
            {
              maxWidth: MAX_TOOLTIP_WIDTH,
              backgroundColor,
              borderColor,
              shadowColor: colors.shadow,
              transform: [{ translateX: -50 }],
            },
          ]}
        >
          {tooltipContent}
          {/* Arrow pointing to the word */}
          {arrowComponent}
        </View>
      </View>
    </Animated.View>
  );
});

// Add display name to the memoized component
WordTooltip.displayName = 'WordTooltip';

const styles = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.TOOLTIP,
  },
  tooltipWrapper: {
    position: 'absolute',
  },
  tooltip: {
    position: 'relative',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    alignSelf: 'flex-start', // Allow content to determine width
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  arrow: {
    position: 'absolute',
    bottom: -8, // Match arrow size
    left: '50%', // Center the arrow
    marginLeft: -8, // Half of arrow width
    width: 0,
    height: 0,
  },
});
