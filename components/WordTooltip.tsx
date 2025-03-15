import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Text, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { LAYOUT } from '../constants/layout';
import { TIMING } from '../constants/ui';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { useColors } from '../hooks/useColors';
import { WordTooltipProps } from '@/types/ui.types';

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 */
export const WordTooltip: React.FC<WordTooltipProps> = ({ visible, text, layout, onClose }) => {
  const isDarkMode = useIsDarkMode();
  const colors = useColors();

  // Auto-close tooltip after standardized delay
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, TIMING.INTERACTION.TOOLTIP_DURATION);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible || !layout) return null;

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

  // Size and position calculations
  const { width: screenWidth } = Dimensions.get('window');
  const TOOLTIP_WIDTH = Math.min(280, screenWidth * 0.8);
  const TOOLTIP_HEIGHT = 46;
  const ARROW_SIZE = 8;
  const TOOLTIP_MARGIN = 10;

  // Calculate the word's center point
  const wordCenterX = layout.x + layout.width / 2;

  // Center the tooltip above the word's center
  let tooltipLeft = wordCenterX - TOOLTIP_WIDTH / 2;

  // Keep tooltip within screen bounds
  tooltipLeft = Math.max(10, Math.min(tooltipLeft, screenWidth - TOOLTIP_WIDTH - 10));

  // Position tooltip directly above the word
  const tooltipTop = layout.y - TOOLTIP_HEIGHT - TOOLTIP_MARGIN;

  // Calculate arrow position to align with word center
  const arrowPosition = wordCenterX - tooltipLeft - ARROW_SIZE;

  return (
    <View
      style={[
        styles.tooltip,
        {
          width: TOOLTIP_WIDTH,
          left: tooltipLeft,
          top: tooltipTop,
          backgroundColor,
          borderColor,
          shadowColor: colors.shadow,
        },
      ]}
      pointerEvents="none"
    >
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
            left: Math.max(16, Math.min(arrowPosition, TOOLTIP_WIDTH - 16)),
            borderTopColor: backgroundColor,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderTopWidth: ARROW_SIZE,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    zIndex: LAYOUT.Z_INDEX.TOOLTIP,
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
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
