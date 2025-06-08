import React, { useEffect, useMemo, useCallback, memo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, Platform, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import {
  analyzeArabicWord,
  formatWordAnalysis,
  hasAnalyzableComponents,
} from '@/utils/arabicWordAnalysis';

// Constants for tooltip sizing and positioning
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.SMALL,
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  MIN_TOOLTIP_HEIGHT: LAYOUT.SPACING.LARGE * 2.2,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.TINY * 1.6,
  PADDING_MULTIPLIER: 1.5,
  Z_INDEX: 999999,
  COMPONENT_LINE_HEIGHT: LAYOUT.SPACING.LARGE,
} as const;

export interface EnhancedWordTooltipProps extends Omit<WordTooltipProps, 'text'> {
  /** The Arabic word */
  arabicWord: string;
  /** The English translation */
  englishTranslation: string;
  /** Whether to show detailed component analysis */
  showAnalysis?: boolean;
}

/**
 * Enhanced tooltip component that displays Arabic word analysis
 * Shows the English translation with component breakdown (prefixes, suffixes, root)
 */
export const EnhancedWordTooltip = memo(
  ({
    visible,
    arabicWord,
    englishTranslation,
    layout,
    onClose,
    zIndex,
    showAnalysis = true,
  }: EnhancedWordTooltipProps) => {
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
        const timer = setTimeout(handleClose, LAYOUT.ANIMATION.DURATION.SLOW * 4); // Longer for more content
        return () => clearTimeout(timer);
      } else {
        handleClose();
      }
      return () => {};
    }, [visible, fadeIn, handleClose]);

    // Analyze the word for components
    const analysis = useMemo(() => {
      if (!showAnalysis || !arabicWord || !englishTranslation) {
        return null;
      }

      if (!hasAnalyzableComponents(arabicWord)) {
        return null;
      }

      return analyzeArabicWord(arabicWord, englishTranslation);
    }, [arabicWord, englishTranslation, showAnalysis]);

    // Format the analysis for display
    const formattedAnalysis = useMemo(() => {
      if (!analysis || !analysis.hasComponents) {
        return null;
      }
      return formatWordAnalysis(analysis);
    }, [analysis]);

    // Get colors based on theme
    const backgroundColor = colors.wordTooltipBg;
    const textColor = colors.wordTooltipText;
    const borderColor = colors.wordTooltipBorder;
    const shadowColor = colors.wordTooltipShadow;
    const secondaryTextColor = colors.secondaryText;

    // Calculate tooltip content and dimensions
    const tooltipContent = useMemo(() => {
      if (formattedAnalysis) {
        // Show enhanced analysis
        return (
          <View style={styles.analysisContainer}>
            {/* Main translation */}
            <ThemedText
              skipDefaultColor
              style={[styles.mainTranslation, { color: textColor }]}
              numberOfLines={2}
            >
              {formattedAnalysis.sections[0]?.content || englishTranslation}
            </ThemedText>

            {/* Component breakdown */}
            {formattedAnalysis.sections.length > 1 && (
              <View style={styles.componentsContainer}>
                <View style={[styles.separator, { backgroundColor: borderColor }]} />
                {formattedAnalysis.sections.slice(1).map((section, index) => (
                  <View key={index} style={styles.componentRow}>
                    {section.arabicPart && section.englishPart ? (
                      // Clear Arabic-to-English mapping
                      <View style={styles.mappingContainer}>
                        <ThemedText
                          skipDefaultColor
                          colorName={section.colorName || 'secondaryText'}
                          style={styles.arabicComponentText}
                          type="arabic"
                        >
                          {section.arabicPart}
                        </ThemedText>
                        <ThemedText
                          skipDefaultColor
                          colorName={section.colorName || 'secondaryText'}
                          style={styles.arrowText}
                        >
                          {section.icon || '→'}
                        </ThemedText>
                        <ThemedText
                          skipDefaultColor
                          colorName={section.colorName || 'secondaryText'}
                          style={styles.englishComponentText}
                        >
                          {section.englishPart}
                        </ThemedText>
                      </View>
                    ) : (
                      // Fallback to original display
                      <ThemedText
                        skipDefaultColor
                        colorName={section.colorName || 'secondaryText'}
                        style={styles.componentText}
                        numberOfLines={1}
                      >
                        {section.content}
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      } else {
        // Show simple translation
        return (
          <ThemedText
            skipDefaultColor
            numberOfLines={2}
            colorName="text"
            style={styles.simpleTranslation}
          >
            {englishTranslation}
          </ThemedText>
        );
      }
    }, [formattedAnalysis, englishTranslation, textColor, borderColor, secondaryTextColor]);

    // Calculate tooltip position and dimensions
    const tooltipPositioning = useMemo(() => {
      if (!layout) {
        return {
          tooltipTop: 0,
          tooltipWidth: 100,
          tooltipLeftOffset: 0,
          arrowOffset: 0,
          tooltipHeight: TOOLTIP_CONSTANTS.MIN_TOOLTIP_HEIGHT,
        };
      }

      const {
        SPACING,
        ARROW_SIZE,
        TOOLTIP_MARGIN,
        MIN_TOOLTIP_HEIGHT,
        SCREEN_MARGIN,
        CHAR_WIDTH,
        PADDING_MULTIPLIER,
        COMPONENT_LINE_HEIGHT,
      } = TOOLTIP_CONSTANTS;

      const wordCenterX = layout.x + layout.width / 2;

      // Calculate height based on content
      let tooltipHeight = MIN_TOOLTIP_HEIGHT;
      if (formattedAnalysis && formattedAnalysis.sections.length > 1) {
        // Main translation + separator + components
        tooltipHeight =
          MIN_TOOLTIP_HEIGHT + (formattedAnalysis.sections.length - 1) * COMPONENT_LINE_HEIGHT;
      }

      const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - tooltipHeight;

      // Calculate width based on content
      const maxLineLength = Math.max(
        englishTranslation.length,
        ...(formattedAnalysis?.sections.map(s => s.content.length) || [])
      );

      let tooltipWidth = Math.max(
        maxLineLength * CHAR_WIDTH + SPACING * PADDING_MULTIPLIER * 2,
        layout.width + SPACING * 2,
        LAYOUT.SPACING.XLARGE * 2
      );

      // Ensure minimum width for readability
      const minWidthForContent = Math.max(
        englishTranslation.length * CHAR_WIDTH * 1.2 + SPACING * 4,
        LAYOUT.SPACING.XLARGE * 2
      );

      // Constrain to reasonable screen width
      tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.85);
      tooltipWidth = Math.max(tooltipWidth, minWidthForContent);

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
        tooltipTop,
        tooltipWidth,
        tooltipLeftOffset,
        arrowOffset,
        tooltipHeight,
      };
    }, [layout, englishTranslation, formattedAnalysis, screenWidth]);

    if (!visible || !layout) return null;

    const { tooltipTop, tooltipWidth, tooltipLeftOffset, arrowOffset, tooltipHeight } =
      tooltipPositioning;

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tooltipContainer,
          styles.absoluteFull,
          {
            top: tooltipTop,
            zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
          },
          opacityStyle as ViewStyle,
        ]}
      >
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipLeftOffset,
              width: tooltipWidth,
              minHeight: tooltipHeight,
              backgroundColor,
              borderColor,
              shadowColor,
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
EnhancedWordTooltip.displayName = 'EnhancedWordTooltip';

const styles = StyleSheet.create({
  absoluteFull: {
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  analysisContainer: {
    gap: LAYOUT.SPACING.TINY,
  },
  arrow: {
    borderStyle: 'solid',
    height: 0,
    left: 0,
    marginLeft: -TOOLTIP_CONSTANTS.ARROW_SIZE / 2,
    position: 'absolute',
    width: 0,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  componentText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
  },
  componentsContainer: {
    gap: LAYOUT.SPACING.TINY / 2,
  },
  mainTranslation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
    textAlign: 'center',
  },
  mappingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY / 2,
    flex: 1,
  },
  arabicComponentText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '600',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.3,
  },
  arrowText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    marginHorizontal: 2,
  },
  englishComponentText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3,
    flex: 1,
  },
  separator: {
    height: 1,
    marginVertical: LAYOUT.SPACING.TINY / 2,
    opacity: 0.3,
  },
  simpleTranslation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
    textAlign: 'center',
  },
  tooltip: {
    alignSelf: 'flex-start',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: LAYOUT.OPACITY.SUBTLE,
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
});
