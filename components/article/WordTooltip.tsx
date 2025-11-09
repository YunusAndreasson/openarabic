import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import {
  TOOLTIP_CONSTANTS,
  calculateTooltipDimensions,
  type TooltipLayout,
} from '@/utils/positioningUtils';

// Static constants to prevent recreation
const STATIC_STYLES = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tooltip: {
    position: 'absolute',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    paddingHorizontal: TOOLTIP_CONSTANTS.MIN_PADDING,
    paddingVertical: LAYOUT.SPACING.SMALL, // Tighter vertical padding
    minWidth: Math.max(LAYOUT.CARD.HEIGHT.LIST_ITEM, 120), // Tighter minimum width
    // Width is now calculated dynamically based on text length
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL +
      LAYOUT.SPACING.SMALL, // Tighter minimum height for compact appearance
  },
  text: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  singleLineText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
    includeFontPadding: false,
    textAlignVertical: 'center',
    // Ensure text doesn't overflow horizontally
    maxWidth: '100%',
  },
  chevronIcon: {
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Default dimensions for fallback
const DEFAULT_DIMENSIONS = {
  tooltipLeft: 0,
  tooltipTop: 0,
  tooltipWidth: 120,
  tooltipHeight: 40,
  arrowLeft: 60,
} as const;

export function WordTooltip({
  visible,
  text = '',
  arabicWord,
  layout,
  zIndex,
  onOpenWordDetails,
  showWordDetails = true,
}: WordTooltipProps) {
  const colors = useColors();

  // Press animation for better user feedback
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
    springConfig: SPRING_CONFIG.RESPONSIVE,
  });

  // Arabic word analysis for English color-coding
  const { formattedAnalysis, analysis } = useArabicWordAnalysis(
    arabicWord || '',
    text,
    !!(arabicWord && text),
  );

  // Generate color-coded segments using shared utility
  const coloredSegments = generateColorCodedSegments({
    text,
    formattedAnalysis,
    analysis,
    colors,
    defaultColor: colors.text,
  });

  const handleOpenWordDetails = () => {
    if (onOpenWordDetails) {
      onOpenWordDetails();
    }
  };

  // Render color-coded English text
  const renderColorCodedEnglish = (
    <View style={STATIC_STYLES.textContainer}>
      <ThemedText skipDefaultColor style={STATIC_STYLES.singleLineText} numberOfLines={1}>
        {coloredSegments.map(segment => (
          <ThemedText
            key={segment.key}
            skipDefaultColor
            style={[STATIC_STYLES.singleLineText, { color: segment.color }]}
            numberOfLines={1}
          >
            {segment.text}
          </ThemedText>
        ))}
      </ThemedText>
    </View>
  );

  // Calculate tooltip dimensions using window coordinates directly
  // No coordinate conversion needed - overlay is full-screen absolute
  const dimensions = !layout
    ? DEFAULT_DIMENSIONS
    : (() => {
        // Validate coordinates are reasonable before showing tooltip
        if (layout.x < 0 || layout.y < 0 || layout.x > SCREEN_WIDTH) {
          return DEFAULT_DIMENSIONS; // Skip tooltip for invalid coordinates
        }

        // Use combined text from segments for dimension calculation
        const displayedText = coloredSegments.map(s => s.text).join('');
        return calculateTooltipDimensions(
          layout as TooltipLayout, // Use window coordinates directly
          displayedText,
          false,
          undefined,
          0, // No container offset needed
          SCREEN_WIDTH, // Use screen width directly for boundary checks
        );
      })();

  const containerStyle = {
    ...STATIC_STYLES.overlay,
    zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
  };

  const effectiveTooltipHeight = Math.max(dimensions.tooltipHeight, MIN_TOUCH_TARGET.MEDIUM);

  const tooltipStyle = {
    ...STATIC_STYLES.tooltip,
    top: dimensions.tooltipTop,
    left: dimensions.tooltipLeft,
    width: dimensions.tooltipWidth,
    height: effectiveTooltipHeight,
    backgroundColor: colors.elevation1,
    borderColor: colors.border,
    zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1,
    ...LAYOUT.ELEVATION.LARGE,
    shadowColor: colors.shadow, // Override elevation shadowColor with theme color
  };

  const arrowStyle = {
    ...STATIC_STYLES.arrow,
    left: dimensions.arrowLeft,
    top: effectiveTooltipHeight,
    borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
    borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
    borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
    borderTopColor: colors.elevation1,
    borderLeftColor: colors.transparent,
    borderRightColor: colors.transparent,
  };

  if (!visible || !layout) return null;

  return (
    <View style={containerStyle} pointerEvents="box-none">
      <Pressable
        onPress={handleOpenWordDetails}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onOpenWordDetails}
      >
        <Animated.View style={[tooltipStyle, animatedStyle]} testID="word-tooltip">
          <View style={arrowStyle} />
          <View style={STATIC_STYLES.contentContainer}>
            {renderColorCodedEnglish}
            {showWordDetails && (
              <Ionicons
                name="chevron-forward"
                size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                color={colors.secondaryText}
                style={STATIC_STYLES.chevronIcon}
              />
            )}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

WordTooltip.displayName = 'WordTooltip';
