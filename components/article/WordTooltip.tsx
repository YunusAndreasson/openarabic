import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SPRING_CONFIG } from '@/constants/animation';
import type { ColorName } from '@/constants/colors';
import { LAYOUT, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations/usePressAnimation';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { WordTooltipProps } from '@/types/ui/modal.types';
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
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    minWidth: LAYOUT.CARD.HEIGHT.LIST_ITEM,
    maxWidth: SCREEN_WIDTH * TOOLTIP_CONSTANTS.MAX_WIDTH_RATIO,
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
    justifyContent: 'space-between',
    flex: 1,
  },
  chevronIcon: {
    marginLeft: LAYOUT.SPACING.TINY,
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
  idText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
    opacity: 0.7,
  },
});

// Hoisted regex and helpers to avoid per-call allocations
const LETTER_RE = /[a-z]/;
const isNonLetter = (ch: string) => !LETTER_RE.test(ch);

const COLOR_MAP = {
  tint: 'tint',
  primary: 'primary',
  warning: 'warning',
  secondaryText: 'secondaryText',
} as const;

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
    prevProps.onClose !== nextProps.onClose
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
  ({
    visible,
    text = '',
    arabicWord,
    wordId,
    layout,
    zIndex,
    onOpenWordDetails,
  }: WordTooltipProps) => {
    const colors = useColors();

    // Press animation for better user feedback
    const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
      type: 'card',
      springConfig: SPRING_CONFIG.RESPONSIVE,
    });

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

    // Memoize color mapping to prevent recreation
    const colorMapping = useMemo(
      () => ({
        tint: colors.tint,
        primary: colors.primary,
        warning: colors.warning,
        secondaryText: colors.secondaryText,
        text: colors.text,
      }),
      [colors.tint, colors.primary, colors.warning, colors.secondaryText, colors.text]
    );

    // Render color-coded English text with optimized processing
    const renderColorCodedEnglish = useMemo(() => {
      // Single words should never have grammar color-coding
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount === 1) {
        return (
          <View>
            <ThemedText skipDefaultColor style={[STATIC_STYLES.text, { color: colors.text }]}>
              {text}
            </ThemedText>
            {wordId && (
              <ThemedText
                skipDefaultColor
                style={[STATIC_STYLES.idText, { color: colors.secondaryText }]}
              >
                [{wordId}]
              </ThemedText>
            )}
          </View>
        );
      }

      if (!formattedAnalysis?.sections?.length) {
        return (
          <View>
            <ThemedText skipDefaultColor style={[STATIC_STYLES.text, { color: colors.text }]}>
              {text}
            </ThemedText>
            {wordId && (
              <ThemedText
                skipDefaultColor
                style={[STATIC_STYLES.idText, { color: colors.secondaryText }]}
              >
                [{wordId}]
              </ThemedText>
            )}
          </View>
        );
      }

      const originalEnglish =
        formattedAnalysis.sections.find(s => s.type === 'original')?.content || text;

      const componentSections = formattedAnalysis.sections.filter(s => s.type === 'components');

      if (!componentSections.length) {
        return (
          <View>
            <ThemedText skipDefaultColor style={[STATIC_STYLES.text, { color: colors.text }]}>
              {originalEnglish}
            </ThemedText>
            {wordId && (
              <ThemedText
                skipDefaultColor
                style={[STATIC_STYLES.idText, { color: colors.secondaryText }]}
              >
                [{wordId}]
              </ThemedText>
            )}
          </View>
        );
      }

      const matchPositions: { start: number; end: number; color: string }[] = [];

      // Add bracket color coding for [the] injection
      if (analysis?.hasBracketInjection) {
        const bracketMatch = originalEnglish.match(/^\[the\]/);
        if (bracketMatch) {
          matchPositions.push({
            start: 0,
            end: 6, // "[the]" length
            color: colors.tint, // Use tint color for brackets
          });
        }
      }

      for (const section of componentSections) {
        if (!section.englishPart) continue;

        const searchText = originalEnglish.toLowerCase();
        const colorKey = section.colorName as keyof typeof COLOR_MAP;
        const colorValue = COLOR_MAP[colorKey] || 'tint';
        const themeColorName: ColorName = colorValue;

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
                  color: colorMapping[themeColorName],
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
        <View>
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
          {wordId && (
            <ThemedText
              skipDefaultColor
              style={[STATIC_STYLES.idText, { color: colors.secondaryText }]}
            >
              [{wordId}]
            </ThemedText>
          )}
        </View>
      );
    }, [formattedAnalysis, text, colors.text, colorMapping, wordId]);

    // Calculate tooltip dimensions with optimized processing
    const dimensions = useMemo(() => {
      if (!layout) {
        return DEFAULT_DIMENSIONS;
      }

      const adjustedLayout: TooltipLayout = {
        x: (layout as TooltipLayout).x - (containerOffsetX || 0),
        y: (layout as TooltipLayout).y,
        width: (layout as TooltipLayout).width,
        height: (layout as TooltipLayout).height,
      } as TooltipLayout;
      return calculateTooltipDimensions(adjustedLayout, text || '', false);
    }, [layout, text, containerOffsetX]);

    // Memoized styles with optimized dependencies
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
            <View style={STATIC_STYLES.contentContainer}>
              {renderColorCodedEnglish}
              {/* Chevron indicator */}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.tint}
                style={STATIC_STYLES.chevronIcon}
              />
            </View>
          </Animated.View>
        </Pressable>
      </View>
    );
  },
  WordTooltipComparison
);

WordTooltip.displayName = 'WordTooltip';
