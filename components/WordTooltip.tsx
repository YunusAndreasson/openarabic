import React, { useEffect, useRef } from 'react';
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
  const MAX_TOOLTIP_WIDTH = screenWidth * 0.7; // Maximum 70% of screen width
  const ARROW_SIZE = 8;
  const TOOLTIP_MARGIN = 10;

  // Calculate the word's center point
  const wordCenterX = layout.x + layout.width / 2;

  // Position tooltip directly above the word
  const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - 30; // Increased height for better visibility

  return (
    <View
      style={[
        styles.tooltipContainer,
        {
          top: tooltipTop,
          left: 0,
          right: 0,
          alignItems: 'center',
        },
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
              transform: [{ translateX: '-50%' }],
            },
          ]}
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
                borderTopColor: backgroundColor,
                borderLeftWidth: ARROW_SIZE,
                borderRightWidth: ARROW_SIZE,
                borderTopWidth: ARROW_SIZE,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

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
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
