import { useCallback, useRef, useState } from 'react';
import type { ViewInstance } from 'react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { FONTS } from '@/constants/fonts';
import { getElevation } from '@/constants/elevation';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, SCREEN_WIDTH } from '@/constants/layout';
import { PRESS_ANIMATION_BUTTON } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useButtonPress } from '@/hooks/ui/useButtonPress';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import {
  TOOLTIP_CONSTANTS,
  calculateTooltipDimensions,
  type TooltipLayout,
} from '@/utils/positioningUtils';
import { cleanWordText } from '@/utils/stringUtils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Module-level constants - zero per-render allocations
// Quick fade-in — short enough that the transparency flash is imperceptible
const ENTER_ANIMATION = FadeIn.duration(100);

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
    minWidth: TOOLTIP_CONSTANTS.MIN_WIDTH,
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
  // No `minHeight` here: the tooltip's own height is already the touch target,
  // and a minimum taller than the padded inner box (44 - 2*8 = 28) overflowed
  // it, which pinned the label to the top of the bubble with dead space below.
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  singleLineText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontFamily: FONTS.ENGLISH,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },
});

const CONTAINER_STYLE = {
  ...STATIC_STYLES.overlay,
  zIndex: TOOLTIP_CONSTANTS.Z_INDEX,
};

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
  onOpenWordDetails,
}: WordTooltipProps) {
  const colors = useColors();
  const containerRef = useRef<ViewInstance>(null);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  // Measure the container's window position to correct coordinate system differences on Android
  const handleLayout = useCallback(() => {
    if (Platform.OS !== 'android') return;
    containerRef.current?.measureInWindow((x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        setContainerOffset({ x, y });
      }
    });
  }, []);

  // Press feedback used to be a hardcoded `scale: pressed ? 0.96 : 1` in the
  // style callback — the same number as PRESS_SCALE.BUTTON, but snapping
  // instead of springing. The shared engine gives it the app's real press.
  const { handlePress, animatedStyle, handlePressIn, handlePressOut } = useButtonPress({
    onPress: onOpenWordDetails,
    disabled: !onOpenWordDetails,
    animationOptions: PRESS_ANIMATION_BUTTON,
  });

  // Clean text by removing punctuation for display
  const cleanedText = cleanWordText(text);
  const cleanedArabicWord = cleanWordText(arabicWord || '');

  // Arabic word analysis for English color-coding
  const { formattedAnalysis, analysis } = useArabicWordAnalysis(
    cleanedArabicWord,
    cleanedText,
    !!(cleanedArabicWord && cleanedText),
  );

  // React Compiler auto-memoizes these derivations
  const coloredSegments = generateColorCodedSegments({
    text: cleanedText,
    formattedAnalysis,
    analysis,
    colors,
    defaultColor: colors.text,
  });

  const dimensions = (() => {
    if (!layout) return DEFAULT_DIMENSIONS;
    if (layout.x < 0 || layout.y < 0 || layout.x > SCREEN_WIDTH) return DEFAULT_DIMENSIONS;

    // Convert window coordinates to container-relative coordinates (fixes Android offset)
    const adjustedLayout: TooltipLayout = {
      x: layout.x - containerOffset.x,
      y: layout.y - containerOffset.y,
      width: layout.width,
      height: layout.height,
    };

    const displayedText = coloredSegments.map(s => s.text).join('');
    return calculateTooltipDimensions(
      adjustedLayout,
      displayedText,
      false,
      undefined,
      SCREEN_WIDTH,
    );
  })();

  // `TOOLTIP_CONSTANTS.HEIGHT` already is the touch-target floor, and the
  // positioning math above placed the bubble against it — flooring again here
  // is what let the rendered box outgrow the box it was positioned as.
  const effectiveHeight = dimensions.tooltipHeight;
  const dynamicStyles = {
    tooltip: {
      ...STATIC_STYLES.tooltip,
      top: dimensions.tooltipTop,
      left: dimensions.tooltipLeft,
      width: dimensions.tooltipWidth,
      height: effectiveHeight,
      backgroundColor: colors.elevation1,
      borderColor: colors.border,
      zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1,
      ...getElevation(colors, 'MODAL'),
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

  if (!visible || !layout) return null;

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={CONTAINER_STYLE}
      pointerEvents="box-none"
    >
      <Animated.View entering={ENTER_ANIMATION} style={dynamicStyles.tooltip} testID="word-tooltip">
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!onOpenWordDetails}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
          style={[STATIC_STYLES.contentContainer, animatedStyle]}
        >
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
        </AnimatedPressable>
        <View style={dynamicStyles.arrow} />
      </Animated.View>
    </View>
  );
}

WordTooltip.displayName = 'WordTooltip';
