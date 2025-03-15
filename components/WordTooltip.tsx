import React, { useEffect, useState } from 'react';
import { StyleSheet, View, LayoutRectangle, Dimensions, Text } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';
import { WordTooltipProps } from '@/types/ui.types';

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 */
export const WordTooltip: React.FC<WordTooltipProps> = ({ visible, text, layout, onClose }) => {
  const isDarkMode = useIsDarkMode();
  const { width: screenWidth } = Dimensions.get('window');
  const [textWidth, setTextWidth] = useState(0);

  // Use fade animation hook for smooth appearance/disappearance
  const {
    animatedStyle: fadeStyle,
    startAnimation: startFade,
    reverseAnimation: reverseFade,
  } = useFadeInAnimation(0, 100);

  // Animate tooltip visibility
  useEffect(() => {
    if (visible) {
      startFade(0);
    } else {
      reverseFade(0);
    }
  }, [visible, startFade, reverseFade]);

  // Auto-close tooltip after delay
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  // Measure text width to adapt tooltip size
  const onTextLayout = (e: { nativeEvent: { lines: { width: number }[] } }) => {
    if (e.nativeEvent.lines && e.nativeEvent.lines.length > 0) {
      const maxWidth = Math.max(...e.nativeEvent.lines.map(line => line.width));
      setTextWidth(maxWidth + 16);
    }
  };

  if (!visible || !layout) return null;

  // Get colors based on theme
  const backgroundColor = isDarkMode ? 'rgba(28, 28, 33, 0.95)' : 'rgba(255, 255, 255, 0.97)';
  const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.97)' : 'rgba(0, 0, 0, 0.9)';
  const borderColor = isDarkMode ? 'rgba(100, 100, 100, 0.25)' : 'rgba(210, 210, 210, 0.6)';

  // Size and position calculations
  const HORIZONTAL_PADDING = LAYOUT.SPACING.MEDIUM * 2.2;
  const MIN_TOOLTIP_WIDTH = 100;
  const MAX_TOOLTIP_WIDTH = Math.min(280, screenWidth * 0.8);

  // Calculate tooltip width based on text width
  const tooltipWidth = Math.min(
    Math.max(textWidth + HORIZONTAL_PADDING, MIN_TOOLTIP_WIDTH),
    MAX_TOOLTIP_WIDTH
  );

  // Fixed tooltip dimensions
  const TOOLTIP_HEIGHT = 46;
  const ARROW_SIZE = 8;
  const TOOLTIP_MARGIN = 10;

  // Calculate the word's center point
  const wordCenterX = layout.x + layout.width / 2;

  // Center the tooltip above the word's center
  let tooltipLeft = wordCenterX - tooltipWidth / 2;

  // Keep tooltip within screen bounds
  tooltipLeft = Math.max(10, Math.min(tooltipLeft, screenWidth - tooltipWidth - 10));

  // Position tooltip directly above the word
  const tooltipTop = layout.y - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;

  // Calculate arrow position to align with word center
  const arrowPosition = wordCenterX - tooltipLeft - ARROW_SIZE;

  return (
    <Animated.View
      style={[
        styles.tooltip,
        fadeStyle,
        {
          position: 'absolute',
          width: tooltipWidth,
          left: tooltipLeft,
          top: tooltipTop,
          backgroundColor,
          borderColor,
        },
      ]}
      pointerEvents="none"
    >
      {/* Hidden text for measurement */}
      <Text style={styles.hiddenText} onTextLayout={onTextLayout} numberOfLines={2}>
        {text}
      </Text>

      <ThemedText
        style={[styles.tooltipText, { color: textColor }]}
        skipDefaultColor
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {text}
      </ThemedText>

      {/* Arrow pointing to the word */}
      <View
        style={[
          styles.arrow,
          {
            left: Math.max(16, Math.min(arrowPosition, tooltipWidth - 16)),
            borderTopColor: backgroundColor,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderTopWidth: ARROW_SIZE,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Reduced shadow offset
    shadowOpacity: 0.15, // Reduced shadow opacity
    shadowRadius: 6, // Reduced shadow radius
    elevation: 4, // Reduced elevation
    zIndex: 9999,
  },
  tooltipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  hiddenText: {
    opacity: 0,
    position: 'absolute',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
  arrow: {
    position: 'absolute',
    bottom: -8, // Match arrow size
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
