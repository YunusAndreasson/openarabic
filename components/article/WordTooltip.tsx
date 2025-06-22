import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

// Extract all constants outside component to prevent recreation
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.SMALL,
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  TOOLTIP_HEIGHT: LAYOUT.SPACING.LARGE * 2.2,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.TINY * 1.6,
  PADDING_MULTIPLIER: 1.5,
  Z_INDEX: 999999,
  AUTO_CLOSE_DURATION: LAYOUT.ANIMATION.DURATION.SLOW * 3,
} as const;

// Static animation config to prevent recreation
const ANIMATION_CONFIG = {
  initialOpacity: 0,
  duration: LAYOUT.ANIMATION.DURATION.FAST,
} as const;

// Cache for expensive tooltip positioning calculations
const positioningCache = new Map<
  string,
  {
    wordCenterX: number;
    tooltipTop: number;
    tooltipWidth: number;
    tooltipLeftOffset: number;
    arrowOffset: number;
  }
>();
const CACHE_MAX_SIZE = 50;

// Static styles to prevent recreation
const STATIC_STYLES = StyleSheet.create({
  tooltipContainer: {
    position: 'absolute',
    zIndex: TOOLTIP_CONSTANTS.Z_INDEX,
  },
  absoluteFull: {
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
    textAlign: 'center',
  },
});

/**
 * Helper function to create a cache key for positioning calculations
 */
const createPositioningCacheKey = (
  layout: NonNullable<WordTooltipProps['layout']>,
  textLength: number,
  screenWidth: number
): string =>
  `${layout.x}-${layout.y}-${layout.width}-${layout.height}-${textLength}-${screenWidth}`;

/**
 * Helper function to calculate tooltip positioning with caching
 */
const calculateTooltipPositioning = (
  layout: NonNullable<WordTooltipProps['layout']>,
  text: string,
  screenWidth: number
) => {
  const cacheKey = createPositioningCacheKey(layout, text.length, screenWidth);

  if (positioningCache.has(cacheKey)) {
    const cached = positioningCache.get(cacheKey);
    if (cached) return cached;
  }

  const {
    SPACING,
    ARROW_SIZE,
    TOOLTIP_MARGIN,
    TOOLTIP_HEIGHT,
    SCREEN_MARGIN,
    CHAR_WIDTH,
    PADDING_MULTIPLIER,
  } = TOOLTIP_CONSTANTS;

  const wordCenterX = layout.x + layout.width / 2;
  const tooltipTop = layout.y - TOOLTIP_MARGIN - ARROW_SIZE - TOOLTIP_HEIGHT;

  let tooltipWidth = Math.max(
    text.length * CHAR_WIDTH + SPACING * PADDING_MULTIPLIER * 2,
    layout.width + SPACING * 2,
    LAYOUT.SPACING.XLARGE
  );

  // Calculate minimum width to prevent word breaking
  const words = text.split(' ');
  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ''
  );

  // Ensure minimum width can fit the longest word with generous padding
  const minWidthForLongestWord = longestWord.length * CHAR_WIDTH * 1.5 + SPACING * 4;

  // Constrain to reasonable screen width but ensure longest word fits
  tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.8);
  tooltipWidth = Math.max(tooltipWidth, minWidthForLongestWord);

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

  const result = {
    wordCenterX,
    tooltipTop,
    tooltipWidth,
    tooltipLeftOffset,
    arrowOffset,
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

/**
 * Custom comparison function for WordTooltip memo
 */
const WordTooltipComparison = (
  prevProps: WordTooltipProps,
  nextProps: WordTooltipProps
): boolean => {
  // Compare primitive values
  if (
    prevProps.visible !== nextProps.visible ||
    prevProps.text !== nextProps.text ||
    prevProps.arabicWord !== nextProps.arabicWord ||
    prevProps.wordId !== nextProps.wordId ||
    prevProps.zIndex !== nextProps.zIndex
  ) {
    return false;
  }

  // Compare layout objects (deep comparison)
  const prevLayout = prevProps.layout;
  const nextLayout = nextProps.layout;

  if (prevLayout === null && nextLayout === null) {
    return true;
  }

  if (prevLayout === null || nextLayout === null) {
    return false;
  }

  if (
    prevLayout.x !== nextLayout.x ||
    prevLayout.y !== nextLayout.y ||
    prevLayout.width !== nextLayout.width ||
    prevLayout.height !== nextLayout.height
  ) {
    return false;
  }

  // onClose functions are likely to be stable, but we'll treat as equal
  // if all other props are equal (following React.memo patterns)
  return true;
};

/**
 * A tooltip component that displays above an Arabic word
 * Shows the English translation of the word with minimal visual design
 * Enhanced with color-coded Arabic word analysis for educational purposes
 * Ensures the arrow tip is precisely centered over the word regardless of screen position
 */
export const WordTooltip = memo(
  ({ visible, text = '', arabicWord, wordId, layout, onClose, zIndex }: WordTooltipProps) => {
    const colors = useColors();
    // For mobile-only apps, use constant screen width
    const screenWidth = SCREEN_WIDTH;

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Setup opacity animation for fade effect with quick timing
    const { fadeIn, animatedStyle: opacityStyle } = useOpacityAnimation(ANIMATION_CONFIG);

    // Memoize colors to prevent unnecessary recalculations
    const tooltipColors = useMemo(
      () => ({
        backgroundColor: colors.elevation3,
        textColor: colors.text,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        transparentColor: colors.transparent,
        // Component colors for Arabic analysis
        tint: colors.tint,
        primary: colors.primary,
        warning: colors.warning,
        secondaryText: colors.secondaryText,
      }),
      [
        colors.elevation3,
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
      if (!analysis.hasComponents) return null;

      return formatWordAnalysis(analysis);
    }, [arabicWord, text]);

    // Handle closing the tooltip with animation sequence
    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    // Render color-coded Arabic text using SINGLE Text component for proper Arabic joining
    const renderColorCodedArabic = useCallback(() => {
      if (!arabicAnalysis?.reconstructedArabic || !arabicWord) {
        // Fallback to plain Arabic text if no analysis
        return arabicWord ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText
              type="arabic"
              skipDefaultColor
              style={[
                STATIC_STYLES.tooltipText,
                { color: tooltipColors.textColor, marginBottom: TOOLTIP_CONSTANTS.SPACING / 2 },
              ]}
            >
              {arabicWord}
            </ThemedText>
          </View>
        ) : null;
      }

      const segments = arabicAnalysis.reconstructedArabic.segments;

      // FIXED: Use SINGLE Text component with nested Text for proper Arabic joining
      // This preserves letter connectivity and RTL flow
      if (segments.length === 0) {
        return (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText
              type="arabic"
              skipDefaultColor
              style={[
                STATIC_STYLES.tooltipText,
                { color: tooltipColors.textColor, marginBottom: TOOLTIP_CONSTANTS.SPACING / 2 },
              ]}
            >
              {arabicWord}
            </ThemedText>
          </View>
        );
      }

      // Create a single continuous text with nested colored spans
      // This approach maintains Arabic text integrity while applying colors
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText
            type="arabic"
            skipDefaultColor
            style={[
              STATIC_STYLES.tooltipText,
              { color: tooltipColors.textColor, marginBottom: TOOLTIP_CONSTANTS.SPACING / 2 },
            ]}
          >
            {/* CRITICAL: Use nested Text within single parent to preserve Arabic joining */}
            {segments.map((segment, index) => {
              // Map color names to actual colors
              const getSegmentColor = (colorName: string): string => {
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

              const segmentColor = getSegmentColor(segment.colorName);
              const segmentKey = `${segment.text}-${index}`;

              return (
                <ThemedText
                  key={segmentKey}
                  type="arabic"
                  skipDefaultColor
                  style={{ color: segmentColor }}
                >
                  {segment.text}
                </ThemedText>
              );
            })}
          </ThemedText>
        </View>
      );
    }, [arabicAnalysis, arabicWord, tooltipColors]);

    // Render color-coded English text to match Arabic components
    const renderColorCodedEnglish = useCallback(() => {
      if (!arabicAnalysis?.sections || arabicAnalysis.sections.length === 0) {
        // Fallback to plain English text if no analysis
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

      // FIXED: Process matches by position in original text, not sequentially
      const originalEnglish =
        arabicAnalysis.sections.find(s => s.type === 'original')?.content || '';

      // Initialize the parts array
      const englishParts: { text: string; color: string; key: string }[] = [];

      // Find all match positions in the original text
      const matchPositions: { start: number; end: number; text: string; match: string }[] = [];

      const allEnglishMatches = arabicAnalysis.sections
        .filter(s => s.type === 'components')
        .flatMap(section => (section.englishPart ? [section.englishPart] : []));

      if (allEnglishMatches.length > 0) {
        for (const match of allEnglishMatches) {
          const normalizedMatch = match.toLowerCase();
          const normalizedEnglish = originalEnglish.toLowerCase();

          // Find all occurrences of this match (in case of duplicates)
          let searchStart = 0;
          while (true) {
            const matchIndex = normalizedEnglish.indexOf(normalizedMatch, searchStart);
            if (matchIndex === -1) break;

            // Verify it's a whole word match (not part of another word)
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
              // Get the actual text with original casing
              const actualText = originalEnglish.substring(
                matchIndex,
                matchIndex + normalizedMatch.length
              );

              matchPositions.push({
                start: matchIndex,
                end: matchIndex + normalizedMatch.length,
                text: actualText,
                match: match,
              });
            }

            searchStart = matchIndex + 1;
          }
        }

        // Sort by position and remove overlaps
        matchPositions.sort((a, b) => a.start - b.start);
        const nonOverlappingMatches: typeof matchPositions = [];
        let lastEnd = 0;

        for (const pos of matchPositions) {
          if (pos.start >= lastEnd) {
            nonOverlappingMatches.push(pos);
            lastEnd = pos.end;
          }
        }

        // Build the parts array from the non-overlapping matches
        let currentIndex = 0;

        // Helper function to get color by matching Arabic component order
        const getEnglishMatchColor = (matchText: string): string => {
          // Find which Arabic component this English text corresponds to
          const matchingSection = arabicAnalysis.sections.find(
            section =>
              section.type === 'components' &&
              section.englishPart &&
              section.englishPart.toLowerCase().includes(matchText.toLowerCase())
          );

          if (matchingSection && matchingSection.colorName) {
            // Use the same color as the corresponding Arabic component
            switch (matchingSection.colorName) {
              case 'tint':
                return tooltipColors.tint;
              case 'warning':
                return tooltipColors.warning;
              case 'primary':
                return tooltipColors.primary;
              case 'secondaryText':
                return tooltipColors.secondaryText;
              default:
                return tooltipColors.tint;
            }
          }

          // Fallback to tint color if no match found
          return tooltipColors.tint;
        };

        for (const pos of nonOverlappingMatches) {
          // Add text before this match (if any)
          if (pos.start > currentIndex) {
            englishParts.push({
              text: originalEnglish.substring(currentIndex, pos.start),
              color: tooltipColors.textColor,
              key: `before-${pos.start}`,
            });
          }

          // Add the matched text (colored with coordinated color)
          englishParts.push({
            text: pos.text,
            color: getEnglishMatchColor(pos.text),
            key: `match-${pos.start}`,
          });
          currentIndex = pos.end;
        }

        // Add any remaining text after the last match
        if (currentIndex < originalEnglish.length) {
          englishParts.push({
            text: originalEnglish.substring(currentIndex),
            color: tooltipColors.textColor,
            key: 'remaining',
          });
        }
      } else {
        // No matches, show original text uncolored
        englishParts.push({
          text: originalEnglish,
          color: tooltipColors.textColor,
          key: 'original',
        });
      }

      return (
        <ThemedText skipDefaultColor numberOfLines={2} style={STATIC_STYLES.tooltipText}>
          {englishParts.map((part: { text: string; color: string; key: string }) => (
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

    // Memoize the tooltip content to reduce re-renders
    const tooltipContent = useMemo(() => {
      const arabicContent = renderColorCodedArabic();
      const englishContent = renderColorCodedEnglish();

      // Debug section with word ID
      const debugContent = wordId ? (
        <ThemedText
          skipDefaultColor
          style={[
            STATIC_STYLES.tooltipText,
            {
              color: tooltipColors.textColor,
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
              opacity: 0.7,
              marginTop: LAYOUT.SPACING.TINY,
            },
          ]}
        >
          ID: {wordId}
        </ThemedText>
      ) : null;

      // If we have Arabic analysis, show both Arabic and English with color coordination
      if (arabicContent && arabicAnalysis?.sections && arabicAnalysis.sections.length > 0) {
        return (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {arabicContent}
            {englishContent}
            {debugContent}
          </View>
        );
      }

      // Otherwise just show English (existing behavior) - still centered
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {englishContent}
          {debugContent}
        </View>
      );
    }, [renderColorCodedArabic, renderColorCodedEnglish, arabicAnalysis, wordId, tooltipColors]);

    // Update tooltip positioning to account for potentially taller content
    const tooltipPositioning = useMemo(() => {
      if (!layout) {
        return {
          wordCenterX: 0,
          tooltipTop: 0,
          tooltipWidth: 100,
          tooltipLeftOffset: 0,
          arrowOffset: 0,
        };
      }

      // Use longer text length if we have Arabic analysis to ensure proper width
      const displayText = arabicAnalysis ? `${arabicWord} ${text}` : text || '';
      return calculateTooltipPositioning(layout, displayText, screenWidth);
    }, [layout, text, arabicWord, arabicAnalysis, screenWidth]);

    // Memoize container style
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.absoluteFull,
        ...STATIC_STYLES.tooltipContainer,
        top: tooltipPositioning.tooltipTop,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
      }),
      [tooltipPositioning.tooltipTop, zIndex]
    );

    // Memoize tooltip style
    const tooltipStyle = useMemo(
      () => ({
        ...STATIC_STYLES.tooltip,
        left: tooltipPositioning.tooltipLeftOffset,
        width: tooltipPositioning.tooltipWidth,
        backgroundColor: tooltipColors.backgroundColor,
        borderColor: tooltipColors.borderColor,
        shadowColor: tooltipColors.shadowColor,
        padding: TOOLTIP_CONSTANTS.SPACING,
      }),
      [
        tooltipPositioning.tooltipLeftOffset,
        tooltipPositioning.tooltipWidth,
        tooltipColors.backgroundColor,
        tooltipColors.borderColor,
        tooltipColors.shadowColor,
      ]
    );

    // Memoize arrow style
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
        fadeIn();

        // Auto-close tooltip after a delay
        timerRef.current = setTimeout(handleClose, TOOLTIP_CONSTANTS.AUTO_CLOSE_DURATION);
      } else {
        handleClose();
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [visible, fadeIn, handleClose]);

    if (!visible || !layout) return null;

    return (
      <Animated.View pointerEvents="none" style={[containerStyle, opacityStyle as ViewStyle]}>
        <View style={tooltipStyle}>
          {tooltipContent}
          <View style={arrowStyle} />
        </View>
      </Animated.View>
    );
  },
  WordTooltipComparison
);

// Add display name to the memoized component
WordTooltip.displayName = 'WordTooltip';
