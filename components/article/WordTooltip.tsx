import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import TouchableIcon from '@/components/TouchableIcon';
import type { ColorName } from '@/constants/Colors';
import { LAYOUT, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import {
  TOOLTIP_CONSTANTS,
  calculateTooltipDimensions,
  type TooltipLayout,
} from '@/utils/positioningUtils';

const ANIMATION_CONFIG = {
  initialOpacity: 0,
  duration: 200,
} as const;

const SPRING_CONFIG = {
  type: 'scale' as const,
  initialValue: 0.85,
  targetValue: 1,
  useSpring: true,
  damping: 12,
  stiffness: 200,
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
    minWidth: LAYOUT.CARD.HEIGHT.LIST_ITEM,
    maxWidth: SCREEN_WIDTH * TOOLTIP_CONSTANTS.MAX_WIDTH_RATIO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderStyle: 'solid',
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButton: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
});

const WordTooltipComparison = (
  prevProps: WordTooltipProps,
  nextProps: WordTooltipProps
): boolean => {
  if (
    prevProps.visible !== nextProps.visible ||
    prevProps.text !== nextProps.text ||
    prevProps.arabicWord !== nextProps.arabicWord ||
    prevProps.isInStudyList !== nextProps.isInStudyList ||
    prevProps.wordRootId !== nextProps.wordRootId
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

// Hoisted regex and helpers to avoid per-call allocations
const LETTER_RE = /[a-z]/;
const isNonLetter = (ch: string) => !LETTER_RE.test(ch);

const COLOR_MAP = {
  tint: 'tint',
  primary: 'primary',
  warning: 'warning',
  secondaryText: 'secondaryText',
} as const;

export const WordTooltip = memo(
  ({
    visible,
    text = '',
    arabicWord,
    layout,
    zIndex,
    isInStudyList = false,
    onStudyListToggle,
    wordRootId,
  }: WordTooltipProps) => {
    const colors = useColors();

    // Animations
    const { fadeIn, animatedStyle: opacityStyle } = useOpacityAnimation(ANIMATION_CONFIG);
    const { animatedStyle: scaleStyle, startAnimation: startScaleAnimation } =
      useTransformAnimation(SPRING_CONFIG);

    // Convert window coordinates (from measureInWindow) to local overlay coordinates
    const containerRef = useRef<View | null>(null);
    const [containerOffsetX, setContainerOffsetX] = useState<number>(0);

    const measureContainerOffset = useCallback(() => {
      if (containerRef.current?.measureInWindow) {
        try {
          containerRef.current.measureInWindow((x: number /* y, w, h */) => {
            if (typeof x === 'number') setContainerOffsetX(x);
          });
        } catch {
          // ignore
        }
      }
    }, []);

    useEffect(() => {
      if (visible) {
        setTimeout(measureContainerOffset, 0);
      }
    }, [visible, measureContainerOffset]);

    // Arabic word analysis for English color-coding
    const { formattedAnalysis } = useArabicWordAnalysis(
      arabicWord || '',
      text,
      !!(arabicWord && text)
    );

    // Stable handlers
    const handleStudyListPress = useCallback(() => {
      onStudyListToggle?.();
    }, [onStudyListToggle]);

    // Render color-coded English text
    const renderColorCodedEnglish = useMemo(() => {
      // Single words should never have grammar color-coding
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount === 1) {
        return (
          <ThemedText skipDefaultColor style={[STATIC_STYLES.text, { color: colors.text }]}>
            {text}
          </ThemedText>
        );
      }

      if (!formattedAnalysis?.sections?.length) {
        return (
          <ThemedText skipDefaultColor style={[STATIC_STYLES.text, { color: colors.text }]}>
            {text}
          </ThemedText>
        );
      }

      const originalEnglish =
        formattedAnalysis.sections.find(s => s.type === 'original')?.content || text;

      const componentSections = formattedAnalysis.sections.filter(s => s.type === 'components');

      if (!componentSections.length) {
        return (
          <ThemedText skipDefaultColor style={[STATIC_STYLES.text, { color: colors.text }]}>
            {originalEnglish}
          </ThemedText>
        );
      }

      const matchPositions: { start: number; end: number; color: string }[] = [];

      for (const section of componentSections) {
        if (!section.englishPart) continue;

        const searchText = originalEnglish.toLowerCase();
        const colorKey = section.colorName as keyof typeof COLOR_MAP;
        const colorValue = COLOR_MAP[colorKey] || 'tint';
        const themeColorName: ColorName = colorValue;
        // use hoisted isNonLetter

        // Split possible multiple english matches like "his / its / it"
        const candidates = section.englishPart
          .toLowerCase()
          .split('/')
          .map(s => s.trim())
          .filter(Boolean);

        // Track duplicates (start:end) to avoid overlapping duplicates
        const seen = new Set<string>();
        for (const candidate of candidates) {
          let fromIndex = 0;
          while (fromIndex <= searchText.length) {
            const idx = searchText.indexOf(candidate, fromIndex);
            if (idx === -1) break;

            const prevChar = idx > 0 ? searchText[idx - 1] ?? ' ' : ' ';
            const nextIdx = idx + candidate.length;
            const nextChar = nextIdx < searchText.length ? searchText[nextIdx] ?? ' ' : ' ';
            const isValidMatch =
              idx === 0 ||
              isNonLetter(prevChar) ||
              nextIdx === searchText.length ||
              isNonLetter(nextChar);

            if (isValidMatch) {
              const key = `${idx}:${idx + candidate.length}`;
              if (!seen.has(key)) {
                seen.add(key);
                matchPositions.push({
                  start: idx,
                  end: idx + candidate.length,
                  color: colors[themeColorName],
                });
              }
              // Move past this match to find further non-overlapping matches
              fromIndex = idx + candidate.length;
            } else {
              fromIndex = idx + 1;
            }
          }
        }
      }

      const sortedMatches = matchPositions
        .sort((a, b) => a.start - b.start)
        .filter((match, i, arr) => i === 0 || match.start >= (arr[i - 1]?.end ?? 0));

      const parts: { text: string; color: string; key: string }[] = [];
      let currentIndex = 0;

      for (const match of sortedMatches) {
        if (match.start > currentIndex) {
          parts.push({
            text: originalEnglish.substring(currentIndex, match.start),
            color: colors.text,
            key: `text-${currentIndex}`,
          });
        }
        parts.push({
          text: originalEnglish.substring(match.start, match.end),
          color: match.color,
          key: `match-${match.start}`,
        });
        currentIndex = match.end;
      }

      if (currentIndex < originalEnglish.length) {
        parts.push({
          text: originalEnglish.substring(currentIndex),
          color: colors.text,
          key: 'remaining',
        });
      }

      return (
        <ThemedText skipDefaultColor style={STATIC_STYLES.text}>
          {parts.map(part => (
            <ThemedText
              key={part.key}
              skipDefaultColor
              style={[STATIC_STYLES.text, { color: part.color }]}
            >
              {part.text}
            </ThemedText>
          ))}
        </ThemedText>
      );
    }, [formattedAnalysis, text, colors]);

    // Tooltip content
    const tooltipContent = useMemo(() => {
      if (!onStudyListToggle || !wordRootId) {
        return renderColorCodedEnglish;
      }

      return (
        <View style={STATIC_STYLES.contentRow}>
          <View style={STATIC_STYLES.textContainer}>{renderColorCodedEnglish}</View>
          <TouchableIcon
            icon={'school'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            touchSize="small"
            color={isInStudyList ? colors.tint : colors.secondaryText}
            onPress={handleStudyListPress}
            style={STATIC_STYLES.bookmarkButton}
          />
        </View>
      );
    }, [
      renderColorCodedEnglish,
      onStudyListToggle,
      wordRootId,
      isInStudyList,
      colors.tint,
      colors.secondaryText,
      handleStudyListPress,
    ]);

    // Calculate tooltip dimensions
    const dimensions = useMemo(() => {
      if (!layout) {
        return {
          tooltipLeft: 0,
          tooltipTop: 0,
          tooltipWidth: 120,
          tooltipHeight: 40,
          arrowLeft: 60,
        };
      }

      const hasBookmark = !!(onStudyListToggle && wordRootId);
      const adjustedLayout: TooltipLayout = {
        x: (layout as TooltipLayout).x - (containerOffsetX || 0),
        y: (layout as TooltipLayout).y,
        width: (layout as TooltipLayout).width,
        height: (layout as TooltipLayout).height,
      } as TooltipLayout;
      return calculateTooltipDimensions(adjustedLayout, text || '', hasBookmark);
    }, [layout, text, onStudyListToggle, wordRootId, containerOffsetX]);

    // Memoized styles
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.overlay,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
      }),
      [zIndex]
    );

    const tooltipStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltip,
        top: dimensions.tooltipTop,
        left: dimensions.tooltipLeft,
        width: dimensions.tooltipWidth,
        height: dimensions.tooltipHeight,
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
        dimensions.tooltipHeight,
        colors.elevation1,
        colors.border,
        colors.shadow,
      ]
    );

    const arrowStyle = useMemo(
      () => ({
        ...STATIC_STYLES.arrow,
        left: dimensions.arrowLeft,
        top: dimensions.tooltipHeight,
        borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderTopColor: colors.elevation1,
        borderLeftColor: colors.transparent,
        borderRightColor: colors.transparent,
      }),
      [dimensions.arrowLeft, dimensions.tooltipHeight, colors.elevation1, colors.transparent]
    );

    useEffect(() => {
      if (visible) {
        fadeIn();
        startScaleAnimation();
      }
    }, [visible, fadeIn, startScaleAnimation]);

    if (!visible || !layout) return null;

    return (
      <View
        ref={containerRef}
        style={containerStyle}
        pointerEvents="box-none"
        onLayout={measureContainerOffset}
      >
        <Animated.View style={[tooltipStyle, opacityStyle, scaleStyle]} testID="word-tooltip">
          <View style={arrowStyle} />
          {tooltipContent}
        </Animated.View>
      </View>
    );
  },
  WordTooltipComparison
);

WordTooltip.displayName = 'WordTooltip';
