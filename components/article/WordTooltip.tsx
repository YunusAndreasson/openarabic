import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import TouchableIcon from '@/components/TouchableIcon';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { CACHE_SIZE } from '@/constants/performance';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useArabicWordAnalysis } from '@/hooks/vocabulary';
import type { WordTooltipProps } from '@/types/ui/modal.types';

// Extract all constants outside component to prevent recreation
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.TINY,
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.SMALL,
  PADDING_MULTIPLIER: 1.5,
  Z_INDEX: 999999,
} as const;

// Static animation configs to prevent recreation
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

// Typography constants - simplified for English-only display
const TYPOGRAPHY_SIZES = {
  ENGLISH_HEIGHT: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
} as const;

// Cache for expensive tooltip positioning calculations
const positioningCache = new Map<
  string,
  {
    tooltipTop: number;
    tooltipWidth: number;
    tooltipLeftOffset: number;
    arrowOffset: number;
  }
>();
const CACHE_MAX_SIZE = CACHE_SIZE.LARGE;

// Static styles to prevent recreation - simplified for English-only
const STATIC_STYLES = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    zIndex: TOOLTIP_CONSTANTS.Z_INDEX,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tooltip: {
    ...LAYOUT.ELEVATION.SUBTLE,
    alignSelf: 'flex-start',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    position: 'absolute',
  },
  arrow: {
    borderStyle: 'solid',
    height: 0,
    left: 0,
    marginLeft: -TOOLTIP_CONSTANTS.ARROW_SIZE / 2,
    position: 'absolute',
    width: 0,
  },
  tooltipText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    textAlign: 'center',
  },
  englishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  englishContent: {
    alignItems: 'center',
  },
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Helper functions extracted and optimized
const createPositioningCacheKey = (
  layout: NonNullable<WordTooltipProps['layout']>,
  textLength: number,
  screenWidth: number
): string =>
  `${layout.x}-${layout.y}-${layout.width}-${layout.height}-${textLength}-${screenWidth}`;

const calculateTooltipPositioning = (
  layout: NonNullable<WordTooltipProps['layout']>,
  text: string,
  screenWidth: number,
  hasBookmark: boolean = false
) => {
  const cacheKey = createPositioningCacheKey(layout, text.length, screenWidth);

  if (positioningCache.has(cacheKey)) {
    const cached = positioningCache.get(cacheKey);
    if (cached) return cached;
  }

  const { SPACING, ARROW_SIZE, TOOLTIP_MARGIN, SCREEN_MARGIN, CHAR_WIDTH } = TOOLTIP_CONSTANTS;

  // Simplified height calculation for English-only display
  const dynamicTooltipHeight = TYPOGRAPHY_SIZES.ENGLISH_HEIGHT + SPACING * 2;

  const wordCenterX = layout.x + layout.width / 2;
  const extraTopMargin = LAYOUT.SPACING.SMALL;
  const tooltipTop = layout.y - dynamicTooltipHeight - ARROW_SIZE - TOOLTIP_MARGIN - extraTopMargin;

  const bookmarkSpace = hasBookmark
    ? LAYOUT.BUTTON.ICON_SIZE.MEDIUM + SPACING * 2 + LAYOUT.SPACING.TINY
    : 0;

  // Optimized width calculation - more generous to prevent text wrapping
  const words = text.split(' ');
  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ''
  );

  // More generous width calculation to prevent wrapping
  const estimatedTextWidth = text.length * CHAR_WIDTH * 1.2; // Increased multiplier
  const minWidthForLongestWord = longestWord.length * CHAR_WIDTH * 2; // Increased multiplier
  const generousPadding = SPACING * 4; // More padding

  let tooltipWidth = Math.max(
    estimatedTextWidth + generousPadding + bookmarkSpace,
    layout.width + SPACING * 2,
    LAYOUT.SPACING.XLARGE,
    minWidthForLongestWord + generousPadding + bookmarkSpace
  );

  // Allow wider tooltips before hitting screen limit
  tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.9);

  // Simplified positioning logic
  const idealTooltipLeft = wordCenterX - tooltipWidth / 2;
  const leftOverflow = SCREEN_MARGIN - idealTooltipLeft;
  const rightOverflow = idealTooltipLeft + tooltipWidth - (screenWidth - SCREEN_MARGIN);

  let tooltipLeftOffset = idealTooltipLeft;
  let arrowOffset = tooltipWidth / 2;

  if (leftOverflow > 0) {
    tooltipLeftOffset = SCREEN_MARGIN;
    arrowOffset = wordCenterX - SCREEN_MARGIN;
  } else if (rightOverflow > 0) {
    tooltipLeftOffset = screenWidth - SCREEN_MARGIN - tooltipWidth;
    arrowOffset = wordCenterX - tooltipLeftOffset;
  }

  const result = {
    tooltipTop,
    tooltipWidth,
    tooltipLeftOffset,
    arrowOffset: Math.max(
      TOOLTIP_CONSTANTS.ARROW_SIZE,
      Math.min(arrowOffset, tooltipWidth - TOOLTIP_CONSTANTS.ARROW_SIZE)
    ),
  };

  // Cache management
  if (positioningCache.size >= CACHE_MAX_SIZE) {
    const firstKey = positioningCache.keys().next().value;
    if (firstKey) positioningCache.delete(firstKey);
  }
  positioningCache.set(cacheKey, result);

  return result;
};

// Simplified comparison function
const WordTooltipComparison = (
  prevProps: WordTooltipProps,
  nextProps: WordTooltipProps
): boolean => {
  if (
    prevProps.visible !== nextProps.visible ||
    prevProps.text !== nextProps.text ||
    prevProps.arabicWord !== nextProps.arabicWord ||
    prevProps.isInStudyList !== nextProps.isInStudyList ||
    prevProps.wordRootId !== nextProps.wordRootId ||
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

// Color mapping function extracted outside component to prevent recreation
const getColorFromMap = (colorName: string, colors: any): string => {
  const colorMap = {
    tint: colors.tint,
    primary: colors.primary,
    warning: colors.warning,
    secondaryText: colors.secondaryText,
  };
  return colorMap[colorName as keyof typeof colorMap] || colors.text;
};

// Static content style to prevent recreation
const CONTENT_STYLE = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  minHeight: TYPOGRAPHY_SIZES.ENGLISH_HEIGHT + LAYOUT.SPACING.SMALL,
  paddingVertical: LAYOUT.SPACING.SMALL,
};

// Static bookmark style to prevent recreation
const BOOKMARK_STYLE = { marginLeft: LAYOUT.SPACING.TINY };

export const WordTooltip = memo(
  ({
    visible,
    text = '',
    arabicWord,
    layout,
    onClose,
    zIndex,
    isInStudyList = false,
    onStudyListToggle,
    wordRootId,
  }: WordTooltipProps) => {
    const colors = useColors();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Simplified animations - remove unused state
    const { fadeIn, animatedStyle: opacityStyle } = useOpacityAnimation(ANIMATION_CONFIG);
    const { animatedStyle: scaleStyle, startAnimation: startScaleAnimation } =
      useTransformAnimation(SPRING_CONFIG);

    // Use the Arabic word analysis hook for English color-coding
    const { formattedAnalysis } = useArabicWordAnalysis(
      arabicWord || '',
      text,
      !!(arabicWord && text)
    );

    // Stable handlers with minimal dependencies
    const handleClose = useCallback(() => {
      setTimeout(onClose, 50);
    }, [onClose]);

    const handleStudyListPress = useCallback(() => {
      onStudyListToggle?.();
    }, [onStudyListToggle]);

    // Memoize color operations to prevent re-calculations
    const colorValues = useMemo(
      () => ({
        text: colors.text,
        tint: colors.tint,
        primary: colors.primary,
        warning: colors.warning,
        secondaryText: colors.secondaryText,
        elevation1: colors.elevation1,
        border: colors.border,
        shadow: colors.shadow,
        transparent: colors.transparent,
      }),
      [colors]
    );

    // Optimized English text rendering with stable dependencies
    const renderColorCodedEnglish = useMemo(() => {
      if (!formattedAnalysis?.sections?.length) {
        return (
          <ThemedText
            skipDefaultColor
            style={[STATIC_STYLES.tooltipText, { color: colorValues.text }]}
          >
            {text}
          </ThemedText>
        );
      }

      const originalEnglish =
        formattedAnalysis.sections.find(s => s.type === 'original')?.content || text;
      const componentSections = formattedAnalysis.sections.filter(s => s.type === 'components');

      if (!componentSections.length) {
        return (
          <ThemedText
            skipDefaultColor
            style={[STATIC_STYLES.tooltipText, { color: colorValues.text }]}
          >
            {originalEnglish}
          </ThemedText>
        );
      }

      // Build match positions more efficiently
      const matchPositions: { start: number; end: number; color: string }[] = [];

      for (const section of componentSections) {
        if (!section.englishPart) continue;

        const match = section.englishPart.toLowerCase();
        const searchText = originalEnglish.toLowerCase();
        const matchIndex = searchText.indexOf(match);

        if (matchIndex !== -1) {
          // Simple word boundary check with safe access
          const prevChar = matchIndex > 0 ? searchText[matchIndex - 1] ?? ' ' : ' ';
          const nextChar =
            matchIndex + match.length < searchText.length
              ? searchText[matchIndex + match.length] ?? ' '
              : ' ';

          const isValidMatch =
            matchIndex === 0 ||
            /\s/.test(prevChar) ||
            matchIndex + match.length === searchText.length ||
            /\s/.test(nextChar);

          if (isValidMatch) {
            matchPositions.push({
              start: matchIndex,
              end: matchIndex + match.length,
              color: getColorFromMap(section.colorName || 'tint', colorValues),
            });
          }
        }
      }

      // Remove overlaps and sort
      const sortedMatches = matchPositions
        .sort((a, b) => a.start - b.start)
        .filter((match, i, arr) => i === 0 || match.start >= (arr[i - 1]?.end ?? 0));

      // Build text parts
      const parts: { text: string; color: string; key: string }[] = [];
      let currentIndex = 0;

      for (const match of sortedMatches) {
        if (match.start > currentIndex) {
          parts.push({
            text: originalEnglish.substring(currentIndex, match.start),
            color: colorValues.text,
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
          color: colorValues.text,
          key: 'remaining',
        });
      }

      return (
        <ThemedText skipDefaultColor style={STATIC_STYLES.tooltipText}>
          {parts.map(part => (
            <ThemedText
              key={part.key}
              skipDefaultColor
              style={[STATIC_STYLES.tooltipText, { color: part.color }]}
            >
              {part.text}
            </ThemedText>
          ))}
        </ThemedText>
      );
    }, [formattedAnalysis, text, colorValues]);

    // Memoize bookmark icon properties separately
    const bookmarkProps = useMemo(() => {
      if (!onStudyListToggle || !wordRootId) return null;

      return {
        iconColor: isInStudyList ? colorValues.tint : colorValues.secondaryText,
      };
    }, [onStudyListToggle, wordRootId, isInStudyList, colorValues.tint, colorValues.secondaryText]);

    // Optimized content rendering with minimal dependencies
    const tooltipContent = useMemo(() => {
      if (!bookmarkProps) {
        return renderColorCodedEnglish;
      }

      return (
        <View style={STATIC_STYLES.englishRow}>
          <View style={STATIC_STYLES.englishContent}>{renderColorCodedEnglish}</View>
          <TouchableIcon
            icon={isInStudyList ? 'bookmark' : 'bookmark-outline'}
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            touchSize="small"
            color={bookmarkProps.iconColor}
            onPress={handleStudyListPress}
            style={BOOKMARK_STYLE}
          />
        </View>
      );
    }, [renderColorCodedEnglish, bookmarkProps, handleStudyListPress]);

    // Optimized positioning calculation with better caching
    const positioning = useMemo(() => {
      if (!layout) {
        return {
          tooltipTop: 0,
          tooltipWidth: SCREEN_WIDTH * 0.25,
          tooltipLeftOffset: 0,
          arrowOffset: 0,
        };
      }

      const hasBookmark = !!bookmarkProps;
      return calculateTooltipPositioning(layout, text || '', SCREEN_WIDTH, hasBookmark);
    }, [layout, text, bookmarkProps]);

    // Separate style memoization for better granular control
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.absoluteFill,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
      }),
      [zIndex]
    );

    const tooltipContainerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltipContainer,
        top: positioning.tooltipTop,
        ...LAYOUT.ELEVATION.MEDIUM,
      }),
      [positioning.tooltipTop]
    );

    const tooltipStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltip,
        left: positioning.tooltipLeftOffset,
        width: positioning.tooltipWidth,
        backgroundColor: colorValues.elevation1,
        borderColor: colorValues.border,
        shadowColor: colorValues.shadow,
        padding: TOOLTIP_CONSTANTS.SPACING,
        zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1,
        ...LAYOUT.ELEVATION.LARGE,
      }),
      [
        positioning.tooltipLeftOffset,
        positioning.tooltipWidth,
        colorValues.elevation1,
        colorValues.border,
        colorValues.shadow,
      ]
    );

    const arrowStyle = useMemo(
      () => ({
        ...STATIC_STYLES.arrow,
        left: positioning.arrowOffset,
        borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderTopColor: colorValues.elevation1,
        bottom: -TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftColor: colorValues.transparent,
        borderRightColor: colorValues.transparent,
      }),
      [positioning.arrowOffset, colorValues.elevation1, colorValues.transparent]
    );

    // Simplified animation trigger
    useEffect(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (visible) {
        fadeIn();
        startScaleAnimation();
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [visible, fadeIn, startScaleAnimation]);

    if (!visible || !layout) return null;

    return (
      <View style={containerStyle}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          testID="word-tooltip-backdrop"
        />
        <View style={tooltipContainerStyle}>
          <Animated.View style={[tooltipStyle, opacityStyle, scaleStyle]} testID="word-tooltip">
            <View style={arrowStyle} />
            <View style={CONTENT_STYLE}>{tooltipContent}</View>
          </Animated.View>
        </View>
      </View>
    );
  },
  WordTooltipComparison
);

WordTooltip.displayName = 'WordTooltip';
