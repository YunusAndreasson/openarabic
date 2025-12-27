import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { WORD_TOOLTIP_ANIMATION_DURATION } from '@/components/article/SkiaArabicWord';
import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import {
  LAYOUT,
  LINE_HEIGHT_MULTIPLIERS,
  MIN_TOUCH_TARGET,
  SCREEN_WIDTH,
} from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations/usePressAnimation';
import type { PressAnimationOptions } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import {
  TOOLTIP_CONSTANTS,
  calculateTooltipDimensions,
  type TooltipLayout,
} from '@/utils/positioningUtils';
import { cleanWordText } from '@/utils/stringUtils';

// Module-level constants - zero per-render allocations
const FADE_IN_ANIMATION = FadeIn.duration(WORD_TOOLTIP_ANIMATION_DURATION);

// Disable opacity to avoid conflict with FadeIn layout animation
const PRESS_ANIMATION_OPTIONS: PressAnimationOptions = {
  type: 'card',
  springConfig: SPRING_CONFIG.RESPONSIVE,
  includeOpacity: false,
} as const;

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
    paddingVertical: LAYOUT.SPACING.SMALL,
    minWidth: Math.max(LAYOUT.CARD.HEIGHT.LIST_ITEM, 120),
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
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL +
      LAYOUT.SPACING.SMALL,
  },
  singleLineText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 0,
  },
  chevronIcon: {
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },
});

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

  // Scale-only press animation (no opacity - handled by FadeIn)
  const { animatedStyle, handlePressIn, handlePressOut } =
    usePressAnimation(PRESS_ANIMATION_OPTIONS);

  // Clean text by removing punctuation for display
  const cleanedText = cleanWordText(text);
  const cleanedArabicWord = cleanWordText(arabicWord || '');

  // Arabic word analysis for English color-coding
  const { formattedAnalysis, analysis } = useArabicWordAnalysis(
    cleanedArabicWord,
    cleanedText,
    !!(cleanedArabicWord && cleanedText),
  );

  // Generate color-coded segments using shared utility
  const coloredSegments = useMemo(
    () =>
      generateColorCodedSegments({
        text: cleanedText,
        formattedAnalysis,
        analysis,
        colors,
        defaultColor: colors.text,
      }),
    [cleanedText, formattedAnalysis, analysis, colors],
  );

  // Memoize dimensions calculation
  const dimensions = useMemo(() => {
    if (!layout) return DEFAULT_DIMENSIONS;
    if (layout.x < 0 || layout.y < 0 || layout.x > SCREEN_WIDTH) return DEFAULT_DIMENSIONS;

    const displayedText = coloredSegments.map(s => s.text).join('');
    return calculateTooltipDimensions(
      layout as TooltipLayout,
      displayedText,
      false,
      undefined,
      SCREEN_WIDTH,
    );
  }, [layout, coloredSegments]);

  // Memoize dynamic styles - single object to reduce allocations
  const dynamicStyles = useMemo(() => {
    const effectiveHeight = Math.max(dimensions.tooltipHeight, MIN_TOUCH_TARGET.MEDIUM);
    return {
      container: {
        ...STATIC_STYLES.overlay,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
      },
      tooltip: {
        ...STATIC_STYLES.tooltip,
        top: dimensions.tooltipTop,
        left: dimensions.tooltipLeft,
        width: dimensions.tooltipWidth,
        height: effectiveHeight,
        backgroundColor: colors.elevation1,
        borderColor: colors.border,
        zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1,
        ...LAYOUT.ELEVATION.LARGE,
        shadowColor: colors.shadow,
      },
      arrow: {
        ...STATIC_STYLES.arrow,
        left: dimensions.arrowLeft,
        top: effectiveHeight,
        borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderTopColor: colors.elevation1,
        borderLeftColor: colors.transparent,
        borderRightColor: colors.transparent,
      },
    };
  }, [dimensions, zIndex, colors]);

  // Memoize combined animated style array to prevent recreation
  const tooltipAnimatedStyle = useMemo(
    () => [dynamicStyles.tooltip, animatedStyle],
    [dynamicStyles.tooltip, animatedStyle],
  );

  if (!visible || !layout) return null;

  return (
    <View style={dynamicStyles.container} pointerEvents="box-none">
      <Pressable
        onPress={onOpenWordDetails}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onOpenWordDetails}
        hitSlop={LAYOUT.HIT_SLOP.SMALL}
      >
        <Animated.View
          entering={FADE_IN_ANIMATION}
          style={tooltipAnimatedStyle}
          testID="word-tooltip"
        >
          <View style={dynamicStyles.arrow} />
          <View style={STATIC_STYLES.contentContainer}>
            <View style={STATIC_STYLES.textContainer}>
              <ThemedText skipDefaultColor style={STATIC_STYLES.singleLineText}>
                {coloredSegments.map(segment => (
                  <ThemedText
                    key={segment.key}
                    skipDefaultColor
                    style={[STATIC_STYLES.singleLineText, { color: segment.color }]}
                  >
                    {segment.text}
                  </ThemedText>
                ))}
              </ThemedText>
            </View>
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
