import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TextStyle, LayoutRectangle, Dimensions, Text } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../hooks/animations';

interface WordTooltipProps {
  visible: boolean;
  text: string;
  layout: LayoutRectangle | null;
  onClose: () => void;
}

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with smooth animations
 * and an arrow pointing to the word's center
 */
export const WordTooltip: React.FC<WordTooltipProps> = ({ visible, text, layout, onClose }) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const { width: screenWidth } = Dimensions.get('window');
  const [textWidth, setTextWidth] = useState(0);

  // Use standard animation hooks from the app - only use fade for simplicity
  const {
    animatedStyle: fadeStyle,
    startAnimation: startFade,
    reverseAnimation: reverseFade,
  } = useFadeInAnimation(0, 180);

  // Animate tooltip visibility
  useEffect(() => {
    if (visible) {
      startFade();
    } else {
      reverseFade();
    }
  }, [visible, startFade, reverseFade]);

  // Auto-close tooltip after delay
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  // Measure text width to adapt tooltip size
  const onTextLayout = (e: { nativeEvent: { lines: { width: number }[] } }) => {
    if (e.nativeEvent.lines && e.nativeEvent.lines.length > 0) {
      // Get the width of the widest line if there are multiple lines
      const maxWidth = Math.max(...e.nativeEvent.lines.map(line => line.width));
      // Add a small buffer to ensure text is never clipped
      setTextWidth(maxWidth + 10);
    }
  };

  if (!visible || !layout) return null;

  // Get colors based on theme with improved contrast
  const backgroundColor = isDarkMode ? 'rgba(22, 22, 26, 0.96)' : 'rgba(255, 255, 255, 0.98)';
  const textColor = isDarkMode ? colors.white : colors.black;
  const borderColor = isDarkMode ? 'rgba(80, 80, 80, 0.6)' : 'rgba(210, 210, 210, 0.9)';

  // Size and position calculations - adaptive width
  const HORIZONTAL_PADDING = LAYOUT.SPACING.MEDIUM * 2.2;
  const MIN_TOOLTIP_WIDTH = 90;
  const MAX_TOOLTIP_WIDTH = Math.min(280, screenWidth * 0.8);

  // Calculate tooltip width based on text width with sufficient padding
  const tooltipWidth = Math.min(
    Math.max(textWidth + HORIZONTAL_PADDING, MIN_TOOLTIP_WIDTH),
    MAX_TOOLTIP_WIDTH
  );

  // Fixed tooltip height for stability
  const TOOLTIP_HEIGHT = 50;
  const ARROW_SIZE = 8;
  const TOOLTIP_MARGIN = 14;

  // Calculate the word's center point
  const wordCenterX = layout.x + layout.width / 2;

  // Center the tooltip above the word's center
  let tooltipLeft = wordCenterX - tooltipWidth / 2;

  // Keep tooltip within screen bounds
  tooltipLeft = Math.max(10, Math.min(tooltipLeft, screenWidth - tooltipWidth - 10));

  // Position tooltip directly above the word with fixed margin
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
          transform: [{ translateY: 0 }], // Ensure no transform is applied
        },
      ]}
      pointerEvents="none"
    >
      {/* Hidden text for measurement */}
      <Text style={styles.hiddenText} onTextLayout={onTextLayout} numberOfLines={3}>
        {text}
      </Text>

      <ThemedText
        style={[styles.tooltipText, { color: textColor }]}
        skipDefaultColor
        numberOfLines={3}
      >
        {text}
      </ThemedText>

      {/* Arrow pointing down to the word */}
      <View
        style={[
          styles.arrow,
          {
            left: Math.max(16, Math.min(arrowPosition, tooltipWidth - 16)),
            borderTopColor: backgroundColor,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    padding: LAYOUT.SPACING.MEDIUM + 2,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 9999,
  },
  tooltipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.35,
    paddingHorizontal: 2,
  },
  hiddenText: {
    opacity: 0,
    position: 'absolute',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.35,
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
