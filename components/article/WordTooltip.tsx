import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import TouchableIcon from '@/components/TouchableIcon';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { CACHE_SIZE } from '@/constants/performance';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

// Extract all constants outside component to prevent recreation
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.TINY,
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.TINY * 1.6,
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

// Typography constants to prevent recalculation
const TYPOGRAPHY_SIZES = {
  ENGLISH_HEIGHT: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
  ARABIC_HEIGHT: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 2.5, // Updated to match user's change
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

// Static styles to prevent recreation
const STATIC_STYLES = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    zIndex: TOOLTIP_CONSTANTS.Z_INDEX,
  },
  absoluteFill: {
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%',
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
    flexShrink: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '500',
    lineHeight: TYPOGRAPHY_SIZES.ENGLISH_HEIGHT,
    textAlign: 'center',
  },
  tooltipTextArabic: {
    flexShrink: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.3,
    fontWeight: '500',
    lineHeight: TYPOGRAPHY_SIZES.ARABIC_HEIGHT,
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY,
  },
  englishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  englishContent: {
    flexShrink: 1,
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
  screenWidth: number,
  hasArabicText: boolean = false
): string =>
  `${layout.x}-${layout.y}-${layout.width}-${layout.height}-${textLength}-${screenWidth}-${hasArabicText}`;

const calculateTooltipPositioning = (
  layout: NonNullable<WordTooltipProps['layout']>,
  text: string,
  screenWidth: number,
  hasArabicText: boolean = false,
  hasBookmark: boolean = false
) => {
  const cacheKey = createPositioningCacheKey(layout, text.length, screenWidth, hasArabicText);

  if (positioningCache.has(cacheKey)) {
    const cached = positioningCache.get(cacheKey);
    if (cached) return cached;
  }

  const { SPACING, ARROW_SIZE, TOOLTIP_MARGIN, SCREEN_MARGIN, CHAR_WIDTH, PADDING_MULTIPLIER } =
    TOOLTIP_CONSTANTS;

  // Use consolidated typography constants
  const dynamicTooltipHeight =
    TYPOGRAPHY_SIZES.ARABIC_HEIGHT +
    TYPOGRAPHY_SIZES.ENGLISH_HEIGHT +
    SPACING * 2 +
    LAYOUT.SPACING.TINY;

  const wordCenterX = layout.x + layout.width / 2;
  const extraTopMargin = LAYOUT.SPACING.SMALL;
  const tooltipTop = layout.y - dynamicTooltipHeight - ARROW_SIZE - TOOLTIP_MARGIN - extraTopMargin;

  const bookmarkSpace = hasBookmark
    ? LAYOUT.BUTTON.ICON_SIZE.MEDIUM + SPACING * 2 + LAYOUT.SPACING.TINY
    : 0;

  // Optimized width calculation
  const words = text.split(' ');
  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ''
  );
  const minWidthForLongestWord =
    longestWord.length * CHAR_WIDTH * 1.5 + SPACING * 4 + bookmarkSpace;

  let tooltipWidth = Math.max(
    text.length * CHAR_WIDTH + SPACING * PADDING_MULTIPLIER * 2 + bookmarkSpace,
    layout.width + SPACING * 2,
    LAYOUT.SPACING.XLARGE,
    minWidthForLongestWord
  );

  tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.8);

  // Simplified positioning logic
  const idealTooltipLeft = wordCenterX - tooltipWidth / 2;
  const leftOverflow = SCREEN_MARGIN - idealTooltipLeft;
  const rightOverflow = idealTooltipLeft + tooltipWidth - (screenWidth - SCREEN_MARGIN);

  let tooltipLeftOffset = idealTooltipLeft;
  if (leftOverflow > 0) {
    tooltipLeftOffset = SCREEN_MARGIN;
  } else if (rightOverflow > 0) {
    tooltipLeftOffset = screenWidth - SCREEN_MARGIN - tooltipWidth;
  }

  const result = {
    tooltipTop,
    tooltipWidth,
    tooltipLeftOffset,
    arrowOffset: wordCenterX - tooltipLeftOffset,
  };

  // Manage cache size
  if (positioningCache.size >= CACHE_MAX_SIZE) {
    const firstKey = positioningCache.keys().next().value;
    if (firstKey !== undefined) {
      positioningCache.delete(firstKey);
    }
  }

  positioningCache.set(cacheKey, result);
  return result;
};

// Optimized color mapping function
const getSegmentColor = (colorName: string, tooltipColors: any): string => {
  switch (colorName) {
    case 'tint':
      return tooltipColors.tint;
    case 'primary':
      return tooltipColors.primary;
    case 'warning':
      return tooltipColors.warning;
    case 'secondaryText':
      return tooltipColors.secondaryText;
    default:
      return tooltipColors.textColor;
  }
};

const WordTooltipComparison = (
  prevProps: WordTooltipProps,
  nextProps: WordTooltipProps
): boolean => {
  // Compare primitive values
  if (
    prevProps.visible !== nextProps.visible ||
    prevProps.text !== nextProps.text ||
    prevProps.arabicWord !== nextProps.arabicWord ||
    prevProps.zIndex !== nextProps.zIndex ||
    prevProps.isInStudyList !== nextProps.isInStudyList ||
    prevProps.wordRootId !== nextProps.wordRootId
  ) {
    return false;
  }

  // Compare layout objects
  const prevLayout = prevProps.layout;
  const nextLayout = nextProps.layout;

  if (prevLayout === null && nextLayout === null) return true;
  if (prevLayout === null || nextLayout === null) return false;

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
    layout,
    onClose,
    zIndex,
    isInStudyList = false,
    onStudyListToggle,
    wordRootId,
  }: WordTooltipProps) => {
    const colors = useColors();
    const screenWidth = SCREEN_WIDTH;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    // Setup animations
    const { fadeIn, fadeOut, animatedStyle: opacityStyle } = useOpacityAnimation(ANIMATION_CONFIG);
    const {
      animatedStyle: scaleStyle,
      startAnimation: startScaleAnimation,
      reverseAnimation: reverseScaleAnimation,
    } = useTransformAnimation(SPRING_CONFIG);

    // Memoize colors to prevent unnecessary recalculations
    const tooltipColors = useMemo(
      () => ({
        backgroundColor: colors.elevation1,
        textColor: colors.text,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        transparentColor: colors.transparent,
        tint: colors.tint,
        primary: colors.primary,
        warning: colors.warning,
        secondaryText: colors.secondaryText,
      }),
      [
        colors.elevation1,
        colors.text,
        colors.border,
        colors.shadow,
        colors.transparent,
        colors.tint,
        colors.primary,
        colors.warning,
        colors.secondaryText,
      ]
    );

    // Analyze Arabic word if provided, memoized for performance
    const arabicAnalysis = useMemo(() => {
      if (!arabicWord || !text) return null;
      const analysis = analyzeArabicWord(arabicWord, text);
      return analysis.hasComponents ? formatWordAnalysis(analysis) : null;
    }, [arabicWord, text]);

    // Handle closing the tooltip with animation sequence
    const handleClose = useCallback(() => {
      if (!isAnimatingOut) {
        setIsAnimatingOut(true);
        fadeOut();
        reverseScaleAnimation();

        timerRef.current = setTimeout(() => {
          onClose();
          setIsAnimatingOut(false);
        }, ANIMATION_CONFIG.duration);
      }
    }, [isAnimatingOut, fadeOut, reverseScaleAnimation, onClose]);

    // Handle study list toggle
    const handleStudyListPress = useCallback(() => {
      if (onStudyListToggle && wordRootId) {
        onStudyListToggle();
      }
    }, [onStudyListToggle, wordRootId]);

    // Render color-coded Arabic text
    const renderColorCodedArabic = useCallback(() => {
      if (!arabicAnalysis?.reconstructedArabic || !arabicWord) {
        return arabicWord ? (
          <View style={STATIC_STYLES.centeredContainer}>
            <ThemedText
              type="arabic"
              skipDefaultColor
              style={[
                STATIC_STYLES.tooltipTextArabic,
                { color: tooltipColors.textColor, marginBottom: TOOLTIP_CONSTANTS.SPACING / 2 },
              ]}
            >
              {arabicWord}
            </ThemedText>
          </View>
        ) : null;
      }

      const segments = arabicAnalysis.reconstructedArabic.segments;

      if (segments.length === 0) {
        return (
          <View style={STATIC_STYLES.centeredContainer}>
            <ThemedText
              type="arabic"
              skipDefaultColor
              style={[
                STATIC_STYLES.tooltipTextArabic,
                { color: tooltipColors.textColor, marginBottom: TOOLTIP_CONSTANTS.SPACING / 2 },
              ]}
            >
              {arabicWord}
            </ThemedText>
          </View>
        );
      }

      return (
        <View style={STATIC_STYLES.centeredContainer}>
          <ThemedText
            type="arabic"
            skipDefaultColor
            style={[
              STATIC_STYLES.tooltipTextArabic,
              { color: tooltipColors.textColor, marginBottom: TOOLTIP_CONSTANTS.SPACING / 2 },
            ]}
          >
            {segments.map(segment => (
              <ThemedText
                key={`segment-${segment.text}-${segment.colorName}`}
                type="arabic"
                skipDefaultColor
                style={[
                  STATIC_STYLES.tooltipTextArabic,
                  { color: getSegmentColor(segment.colorName, tooltipColors) },
                ]}
              >
                {segment.text}
              </ThemedText>
            ))}
          </ThemedText>
        </View>
      );
    }, [arabicAnalysis, arabicWord, tooltipColors]);

    // Render color-coded English text
    const renderColorCodedEnglish = useCallback(() => {
      if (!arabicAnalysis?.sections || arabicAnalysis.sections.length === 0) {
        return (
          <ThemedText
            skipDefaultColor
            numberOfLines={2}
            style={[STATIC_STYLES.tooltipText, { color: tooltipColors.textColor }]}
          >
            {text}
          </ThemedText>
        );
      }

      const originalEnglish =
        arabicAnalysis.sections.find(s => s.type === 'original')?.content || '';
      const englishParts: { text: string; color: string; key: string }[] = [];
      const matchPositions: { start: number; end: number; text: string; match: string }[] = [];

      const allEnglishMatches = arabicAnalysis.sections
        .filter(s => s.type === 'components')
        .flatMap(section => (section.englishPart ? [section.englishPart] : []));

      if (allEnglishMatches.length > 0) {
        // Find and process matches (simplified logic)
        for (const match of allEnglishMatches) {
          const normalizedMatch = match.toLowerCase();
          const normalizedEnglish = originalEnglish.toLowerCase();
          let searchStart = 0;

          while (true) {
            const matchIndex = normalizedEnglish.indexOf(normalizedMatch, searchStart);
            if (matchIndex === -1) break;

            const beforeChar = matchIndex > 0 ? normalizedEnglish[matchIndex - 1] || ' ' : ' ';
            const afterChar =
              matchIndex + normalizedMatch.length < normalizedEnglish.length
                ? normalizedEnglish[matchIndex + normalizedMatch.length] || ' '
                : ' ';

            const isWholeWord = /\s/.test(beforeChar) && /\s/.test(afterChar);

            if (
              isWholeWord ||
              matchIndex === 0 ||
              matchIndex + normalizedMatch.length === normalizedEnglish.length
            ) {
              const actualText = originalEnglish.substring(
                matchIndex,
                matchIndex + normalizedMatch.length
              );
              matchPositions.push({
                start: matchIndex,
                end: matchIndex + normalizedMatch.length,
                text: actualText,
                match,
              });
            }
            searchStart = matchIndex + 1;
          }
        }

        // Sort and remove overlaps
        matchPositions.sort((a, b) => a.start - b.start);
        const nonOverlappingMatches: typeof matchPositions = [];
        let lastEnd = 0;

        for (const pos of matchPositions) {
          if (pos.start >= lastEnd) {
            nonOverlappingMatches.push(pos);
            lastEnd = pos.end;
          }
        }

        // Build parts array
        let currentIndex = 0;
        const getEnglishMatchColor = (matchText: string): string => {
          const matchingSection = arabicAnalysis.sections.find(
            section =>
              section.type === 'components' &&
              section.englishPart &&
              section.englishPart
                .toLowerCase()
                .split(' / ')
                .some(part => part.trim().toLowerCase() === matchText.toLowerCase())
          );
          return matchingSection?.colorName
            ? getSegmentColor(matchingSection.colorName, tooltipColors)
            : tooltipColors.tint;
        };

        for (const pos of nonOverlappingMatches) {
          if (pos.start > currentIndex) {
            englishParts.push({
              text: originalEnglish.substring(currentIndex, pos.start),
              color: tooltipColors.textColor,
              key: `before-${pos.start}`,
            });
          }

          englishParts.push({
            text: pos.text,
            color: getEnglishMatchColor(pos.text),
            key: `match-${pos.start}`,
          });
          currentIndex = pos.end;
        }

        if (currentIndex < originalEnglish.length) {
          englishParts.push({
            text: originalEnglish.substring(currentIndex),
            color: tooltipColors.textColor,
            key: 'remaining',
          });
        }
      } else {
        englishParts.push({
          text: originalEnglish,
          color: tooltipColors.textColor,
          key: 'original',
        });
      }

      return (
        <ThemedText skipDefaultColor numberOfLines={2} style={STATIC_STYLES.tooltipText}>
          {englishParts.map(part => (
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
    }, [arabicAnalysis, text, tooltipColors]);

    // Render the study list indicator
    const renderStudyIndicator = useCallback(() => {
      if (!onStudyListToggle || !wordRootId) return null;

      const iconName = isInStudyList ? 'bookmark' : 'bookmark-outline';
      const indicatorColor = isInStudyList ? tooltipColors.tint : tooltipColors.secondaryText;

      return (
        <TouchableIcon
          icon={iconName}
          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
          touchSize="small"
          color={indicatorColor}
          onPress={handleStudyListPress}
          style={{ marginLeft: LAYOUT.SPACING.TINY }}
        />
      );
    }, [onStudyListToggle, wordRootId, isInStudyList, handleStudyListPress, tooltipColors]);

    // Render English text with inline bookmark
    const renderEnglishWithBookmark = useCallback(() => {
      const englishContent = renderColorCodedEnglish();
      const studyIndicator = renderStudyIndicator();

      if (!studyIndicator) return englishContent;

      return (
        <View style={STATIC_STYLES.englishRow}>
          <View style={STATIC_STYLES.englishContent}>{englishContent}</View>
          {studyIndicator}
        </View>
      );
    }, [renderColorCodedEnglish, renderStudyIndicator]);

    // Memoize the tooltip content
    const tooltipContent = useMemo(() => {
      const arabicContent = renderColorCodedArabic();
      const englishWithBookmark = renderEnglishWithBookmark();

      const contentStyle = {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        position: 'relative' as const,
        minHeight:
          TYPOGRAPHY_SIZES.ARABIC_HEIGHT +
          TYPOGRAPHY_SIZES.ENGLISH_HEIGHT +
          LAYOUT.SPACING.TINY +
          LAYOUT.SPACING.SMALL,
        paddingTop: LAYOUT.SPACING.SMALL,
      };

      return (
        <View style={contentStyle}>
          {arabicContent}
          {englishWithBookmark}
        </View>
      );
    }, [renderColorCodedArabic, renderEnglishWithBookmark]);

    // Tooltip positioning
    const tooltipPositioning = useMemo(() => {
      if (!layout) {
        return {
          wordCenterX: 0,
          tooltipTop: 0,
          tooltipWidth: SCREEN_WIDTH * 0.25,
          tooltipLeftOffset: 0,
          arrowOffset: 0,
        };
      }

      const hasBookmark = !!(onStudyListToggle && wordRootId);
      const displayText = arabicWord ? `${arabicWord} ${text}` : text || '';
      return calculateTooltipPositioning(layout, displayText, screenWidth, true, hasBookmark);
    }, [layout, text, arabicWord, screenWidth, onStudyListToggle, wordRootId]);

    // Memoized styles
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.absoluteFill,
        ...STATIC_STYLES.tooltipContainer,
        top: tooltipPositioning.tooltipTop,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
        ...LAYOUT.ELEVATION.MEDIUM,
      }),
      [tooltipPositioning.tooltipTop, zIndex]
    );

    const tooltipStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltip,
        left: tooltipPositioning.tooltipLeftOffset,
        width: tooltipPositioning.tooltipWidth,
        backgroundColor: tooltipColors.backgroundColor,
        borderColor: tooltipColors.borderColor,
        shadowColor: tooltipColors.shadowColor,
        padding: TOOLTIP_CONSTANTS.SPACING,
        zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1,
        ...LAYOUT.ELEVATION.LARGE,
      }),
      [
        tooltipPositioning.tooltipLeftOffset,
        tooltipPositioning.tooltipWidth,
        tooltipColors.backgroundColor,
        tooltipColors.borderColor,
        tooltipColors.shadowColor,
      ]
    );

    const arrowStyle = useMemo(
      () => ({
        ...STATIC_STYLES.arrow,
        left: tooltipPositioning.arrowOffset,
        borderTopWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderRightWidth: TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderTopColor: tooltipColors.backgroundColor,
        bottom: -TOOLTIP_CONSTANTS.ARROW_SIZE,
        borderLeftColor: tooltipColors.transparentColor,
        borderRightColor: tooltipColors.transparentColor,
      }),
      [
        tooltipPositioning.arrowOffset,
        tooltipColors.backgroundColor,
        tooltipColors.transparentColor,
      ]
    );

    // Trigger animations based on visibility
    useEffect(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (visible) {
        setIsAnimatingOut(false);
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

    // Show tooltip if visible OR if we're animating out
    if ((!visible && !isAnimatingOut) || !layout) return null;

    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          { zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 2, ...LAYOUT.ELEVATION.LARGE },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: TOOLTIP_CONSTANTS.Z_INDEX }]}
          onPress={handleClose}
        />
        <Animated.View
          style={[containerStyle, opacityStyle as ViewStyle, scaleStyle as ViewStyle]}
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity
            style={tooltipStyle}
            onPress={handleClose}
            activeOpacity={LAYOUT.OPACITY.SUBTLE}
          >
            {tooltipContent}
            <View style={arrowStyle} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  },
  WordTooltipComparison
);

WordTooltip.displayName = 'WordTooltip';
