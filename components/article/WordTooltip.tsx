import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
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
});

// Default dimensions for fallback
const DEFAULT_DIMENSIONS = {
  tooltipLeft: 0,
  tooltipTop: 0,
  tooltipWidth: 120,
  tooltipHeight: 40,
  arrowLeft: 60,
} as const;

const WordTooltipComparison = (
  prevProps: WordTooltipProps,
  nextProps: WordTooltipProps
): boolean => {
  if (
    prevProps.visible !== nextProps.visible ||
    prevProps.text !== nextProps.text ||
    prevProps.arabicWord !== nextProps.arabicWord ||
    prevProps.onOpenWordDetails !== nextProps.onOpenWordDetails ||
    prevProps.onClose !== nextProps.onClose ||
    prevProps.zIndex !== nextProps.zIndex
  ) {
    return false;
  }

  const prevLayout = prevProps.layout;
  const nextLayout = nextProps.layout;

  if (!prevLayout && !nextLayout) return true;
  if (!prevLayout || !nextLayout) return false;

  return (
    prevLayout.x === nextLayout.x &&
    prevLayout.y === nextLayout.y &&
    prevLayout.width === nextLayout.width &&
    prevLayout.height === nextLayout.height
  );
};

export const WordTooltip = memo(
  ({ visible, text = '', arabicWord, layout, zIndex, onOpenWordDetails }: WordTooltipProps) => {
    const colors = useColors();

    // Press animation for better user feedback
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
      springConfig: SPRING_CONFIG.RESPONSIVE,
    });

    // Convert window coordinates (from measureInWindow) to local overlay coordinates
    const containerRef = useRef<View | null>(null);
    const containerOffsetXRef = useRef<number>(0);
    const containerWidthRef = useRef<number>(0);

    const measureContainerOffset = useCallback(() => {
      if (containerRef.current?.measureInWindow) {
        try {
          containerRef.current.measureInWindow((x: number, _y: number, width: number /* height */) => {
            if (typeof x === 'number') {
              containerOffsetXRef.current = x;
            }
            if (typeof width === 'number' && width > 0) {
              containerWidthRef.current = width;
            }
          });
        } catch {
          // ignore
        }
      }
    }, []);

    // Only measure once when tooltip becomes visible
    useEffect(() => {
      if (visible && layout) {
        measureContainerOffset();
      }
    }, [visible, layout, measureContainerOffset]);

    // Arabic word analysis for English color-coding
    const { formattedAnalysis, analysis } = useArabicWordAnalysis(
      arabicWord || '',
      text,
      !!(arabicWord && text)
    );

    // Stable handlers
    const handleOpenWordDetails = useCallback(() => {
      if (onOpenWordDetails) {
        onOpenWordDetails();
      }
    }, [onOpenWordDetails]);

    // Generate color-coded segments using shared utility
    const coloredSegments = useMemo(
      () =>
        generateColorCodedSegments({
          text,
          formattedAnalysis,
          analysis,
          colors,
          defaultColor: colors.text,
        }),
      [text, formattedAnalysis, analysis, colors]
    );

    // Render color-coded English text
    const renderColorCodedEnglish = useMemo(() => {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
    }, [coloredSegments]);

    // Calculate tooltip dimensions with optimized processing
    const dimensions = useMemo(() => {
      if (!layout) {
        return DEFAULT_DIMENSIONS;
      }

      const adjustedLayout: TooltipLayout = {
        x: (layout as TooltipLayout).x - containerOffsetXRef.current,
        y: (layout as TooltipLayout).y,
        width: (layout as TooltipLayout).width,
        height: (layout as TooltipLayout).height,
      } as TooltipLayout;
      // Use combined text from segments for dimension calculation
      const displayedText = coloredSegments.map(s => s.text).join('');
      return calculateTooltipDimensions(
        adjustedLayout,
        displayedText,
        false,
        undefined,
        containerOffsetXRef.current,
        containerWidthRef.current
      );
    }, [layout, coloredSegments]);

    // Memoized styles with optimized dependencies
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.overlay,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
      }),
      [zIndex]
    );

    const effectiveTooltipHeight = useMemo(
      () => Math.max(dimensions.tooltipHeight, MIN_TOUCH_TARGET.MEDIUM),
      [dimensions.tooltipHeight]
    );

    const tooltipStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltip,
        top: dimensions.tooltipTop,
        left: dimensions.tooltipLeft,
        width: dimensions.tooltipWidth,
        height: effectiveTooltipHeight,
        backgroundColor: colors.elevation1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1,
        ...LAYOUT.ELEVATION.LARGE,
      }),
      [
        dimensions.tooltipTop,
        dimensions.tooltipLeft,
        dimensions.tooltipWidth,
        effectiveTooltipHeight,
        colors.elevation1,
        colors.border,
        colors.shadow,
      ]
    );

    const arrowStyle = useMemo(
      () => ({
        ...STATIC_STYLES.arrow,
        left: dimensions.arrowLeft,
        top: effectiveTooltipHeight,
        borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderTopColor: colors.elevation1,
        borderLeftColor: colors.transparent,
        borderRightColor: colors.transparent,
      }),
      [dimensions.arrowLeft, effectiveTooltipHeight, colors.elevation1, colors.transparent]
    );

    if (!visible || !layout) return null;

    return (
      <View
        ref={containerRef}
        style={containerStyle}
        pointerEvents="box-none"
        onLayout={measureContainerOffset}
      >
        <Pressable
          onPress={handleOpenWordDetails}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!onOpenWordDetails}
        >
          <Animated.View style={[tooltipStyle, animatedStyle]} testID="word-tooltip">
            <View style={arrowStyle} />
            <View style={STATIC_STYLES.contentContainer}>{renderColorCodedEnglish}</View>
          </Animated.View>
        </Pressable>
      </View>
    );
  },
  WordTooltipComparison
);

WordTooltip.displayName = 'WordTooltip';
