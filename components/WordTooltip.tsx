import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions, Platform, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { TIMING } from '../constants/ui';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { useColors } from '../hooks/useColors';
import { WordTooltipProps } from '@/types/ui/modal.types';
import Animated from 'react-native-reanimated';
import { useTransformAnimation } from '@/hooks/animations';
import { TOOLTIP_COLORS } from '../constants/tooltipColors';

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 */
export const WordTooltip = React.memo(({ visible, text, layout, onClose }: WordTooltipProps) => {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();

  // Setup transform animation (scale effect only, no opacity changes)
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
      // Start animation
      startAnimation();

      // Auto-close tooltip after standardized delay
      const timer = setTimeout(() => {
        // Reverse animation then call onClose when complete
        reverseAnimation(onClose);
      }, TIMING.INTERACTION.TOOLTIP_DURATION - 150); // Leave time for animation

      return () => clearTimeout(timer);
    } else {
      reverseAnimation();
      return () => {}; // Empty cleanup for else path
    }
  }, [visible, startAnimation, reverseAnimation, onClose]);

  // Get colors based on theme - using TOOLTIP_COLORS from constants instead of hardcoded values
  const backgroundColor = isDarkMode ? TOOLTIP_COLORS.DARK : TOOLTIP_COLORS.LIGHT;
  const textColor = isDarkMode
    ? colors.text // dark theme text
    : colors.titleText; // light theme text
  const borderColor = isDarkMode
    ? colors.cardBorder // dark theme border
    : colors.cardBorder; // light theme border

  // Size and position calculations for layout (these calculations are safe even if layout is null)
  const { width: screenWidth } = Dimensions.get('window');
  const MAX_TOOLTIP_WIDTH = screenWidth * 0.7; // Maximum 70% of screen width
  const ARROW_SIZE = 8;
  const TOOLTIP_MARGIN = 10;
  const TOOLTIP_HEIGHT = 40; // Estimate height to improve positioning

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
            borderLeftColor: colors.transparent,
            borderRightColor: colors.transparent,
          },
        ]}
      />
    ),
    [backgroundColor, ARROW_SIZE, colors.transparent]
  );

  // Don't render anything if tooltip shouldn't be visible or has no layout
  if (!visible || !layout) return null;

  // Calculate position values based on layout, ensuring perfect centering
  const wordCenterX = layout.x + layout.width / 2;
  const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - TOOLTIP_HEIGHT; // Position better with explicit height

  return (
    <Animated.View
      style={[
        styles.tooltipContainer,
        styles.absoluteFull,
        { top: tooltipTop },
        transformStyle as unknown as ViewStyle,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.tooltipWrapper, { left: wordCenterX }]}>
        <View
          style={[
            styles.tooltip,
            {
              maxWidth: MAX_TOOLTIP_WIDTH,
              backgroundColor,
              borderColor,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {tooltipContent}
          {/* Arrow pointing to the word - centered precisely */}
          {arrowComponent}
        </View>
      </View>
    </Animated.View>
  );
});

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
    zIndex: LAYOUT.Z_INDEX.TOOLTIP,
  },
  tooltipWrapper: {
    position: 'absolute',
    transform: [{ translateX: -50 }], // Center horizontally
  },
  tooltip: {
    position: 'relative',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    alignSelf: 'center', // Center itself
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
