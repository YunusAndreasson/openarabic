import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import TouchableIcon from '@/components/TouchableIcon';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { CACHE_SIZE } from '@/constants/performance';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { WordTooltipProps } from '@/types/ui/modal.types';
import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';

// Extract all constants outside component to prevent recreation
const TOOLTIP_CONSTANTS = {
  SPACING: LAYOUT.SPACING.TINY, // Reduced from SMALL to TINY for less padding
  ARROW_SIZE: LAYOUT.SPACING.TINY,
  TOOLTIP_MARGIN: LAYOUT.SPACING.TINY / 5,
  SCREEN_MARGIN: LAYOUT.SPACING.MEDIUM,
  CHAR_WIDTH: LAYOUT.SPACING.TINY * 1.6,
  PADDING_MULTIPLIER: 1.5,
  Z_INDEX: 999999,
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
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4,
    textAlign: 'center',
  },
  tooltipTextArabic: {
    flexShrink: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '500',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6, // Increased line height for Arabic diacritics
    textAlign: 'center',
    marginTop: LAYOUT.SPACING.TINY, // Extra top margin for Arabic text
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
});

/**
 * Helper function to create a cache key for positioning calculations
 */
const createPositioningCacheKey = (
  layout: NonNullable<WordTooltipProps['layout']>,
  textLength: number,
  screenWidth: number,
  hasArabicText: boolean = false
): string =>
  `${layout.x}-${layout.y}-${layout.width}-${layout.height}-${textLength}-${screenWidth}-${hasArabicText}`;

/**
 * Helper function to calculate tooltip positioning with caching
 */
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

  // Calculate consistent tooltip height - properly account for different text sizes
  const englishHeight = LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4; // English line height
  const arabicHeight = LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6; // Arabic line height (increased for diacritics)
  const paddingHeight = SPACING * 2; // Top and bottom padding
  const arabicTopMargin = LAYOUT.SPACING.TINY; // Extra margin for Arabic text
  const dynamicTooltipHeight = arabicHeight + englishHeight + paddingHeight + arabicTopMargin;

  const wordCenterX = layout.x + layout.width / 2;

  // Simple positioning: tooltip appears directly above the word
  // Add extra margin to prevent Arabic text clipping at top
  const extraTopMargin = LAYOUT.SPACING.SMALL; // Additional space for Arabic diacritics
  const tooltipTop = layout.y - dynamicTooltipHeight - ARROW_SIZE - TOOLTIP_MARGIN - extraTopMargin;

  // Calculate bookmark space if present (icon + gap + touch padding)
  const bookmarkSpace = hasBookmark
    ? LAYOUT.BUTTON.ICON_SIZE.MEDIUM + SPACING * 2 + LAYOUT.SPACING.TINY
    : 0;

  // Calculate tooltip width
  let tooltipWidth = Math.max(
    text.length * CHAR_WIDTH + SPACING * PADDING_MULTIPLIER * 2 + bookmarkSpace,
    layout.width + SPACING * 2,
    LAYOUT.SPACING.XLARGE
  );

  // Calculate minimum width to prevent word breaking
  const words = text.split(' ');
  const longestWord = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ''
  );

  // Ensure minimum width can fit the longest word with generous padding + bookmark space
  const minWidthForLongestWord =
    longestWord.length * CHAR_WIDTH * 1.5 + SPACING * 4 + bookmarkSpace;

  // Constrain to reasonable screen width but ensure longest word fits
  tooltipWidth = Math.min(tooltipWidth, screenWidth * 0.8);
  tooltipWidth = Math.max(tooltipWidth, minWidthForLongestWord);

  // Horizontal positioning with edge constraints
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

  // Arrow offset is relative to tooltip position
  const arrowOffset = wordCenterX - tooltipLeftOffset;

  const result = {
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
    prevProps.zIndex !== nextProps.zIndex ||
    prevProps.isInStudyList !== nextProps.isInStudyList ||
    prevProps.wordRootId !== nextProps.wordRootId
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

    // Handle study list toggle with haptic feedback
    const handleStudyListPress = useCallback(() => {
      if (onStudyListToggle && wordRootId) {
        onStudyListToggle();
      }
    }, [onStudyListToggle, wordRootId]);

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

      // FIXED: Use SINGLE Text component with nested Text for proper Arabic joining
      // This preserves letter connectivity and RTL flow
      if (segments.length === 0) {
        return (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
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

      // Create a single continuous text with nested colored spans
      // This approach maintains Arabic text integrity while applying colors
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText
            type="arabic"
            skipDefaultColor
            style={[
              STATIC_STYLES.tooltipTextArabic,
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
                  style={[STATIC_STYLES.tooltipTextArabic, { color: segmentColor }]}
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

        // Helper function to get color by matching Arabic component exactly
        const getEnglishMatchColor = (matchText: string): string => {
          // Find which Arabic component this English text corresponds to by exact match
          const matchingSection = arabicAnalysis.sections.find(
            section =>
              section.type === 'components' &&
              section.englishPart &&
              section.englishPart
                .toLowerCase()
                .split(' / ')
                .some(part => part.trim().toLowerCase() === matchText.toLowerCase())
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

    // Render the study list indicator with proper integration
    const renderStudyIndicator = useCallback(() => {
      // Only show if we have study functionality
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
          style={{
            marginLeft: LAYOUT.SPACING.TINY,
          }}
        />
      );
    }, [onStudyListToggle, wordRootId, isInStudyList, handleStudyListPress, tooltipColors]);

    // Render English text with inline bookmark
    const renderEnglishWithBookmark = useCallback(() => {
      const englishContent = renderColorCodedEnglish();
      const studyIndicator = renderStudyIndicator();

      if (!studyIndicator) {
        return englishContent;
      }

      return (
        <View style={STATIC_STYLES.englishRow}>
          <View style={STATIC_STYLES.englishContent}>{englishContent}</View>
          {studyIndicator}
        </View>
      );
    }, [renderColorCodedEnglish, renderStudyIndicator]);

    // Memoize the tooltip content with improved layout
    const tooltipContent = useMemo(() => {
      const arabicContent = renderColorCodedArabic();
      const englishWithBookmark = renderEnglishWithBookmark();

      // Proper height calculation accounting for both text sizes
      const englishHeight = LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.4;
      const arabicHeight = LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6; // Increased for diacritics
      const arabicTopMargin = LAYOUT.SPACING.TINY;

      const contentStyle = {
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        position: 'relative' as const,
        // Proper minimum height for Arabic + English text with margins
        minHeight: arabicHeight + englishHeight + arabicTopMargin + LAYOUT.SPACING.SMALL,
        // Add adequate top padding to prevent Arabic text clipping
        paddingTop: LAYOUT.SPACING.SMALL, // Increased from TINY to SMALL
      };

      return (
        <View style={contentStyle}>
          {arabicContent}
          {englishWithBookmark}
        </View>
      );
    }, [renderColorCodedArabic, renderEnglishWithBookmark]);

    // Update tooltip positioning with consistent sizing for all tooltips
    const tooltipPositioning = useMemo(() => {
      if (!layout) {
        return {
          wordCenterX: 0,
          tooltipTop: 0,
          tooltipWidth: SCREEN_WIDTH * 0.25, // Responsive default width (25% of screen)
          tooltipLeftOffset: 0,
          arrowOffset: 0,
        };
      }

      // Check if we have a bookmark to account for its space
      const hasBookmark = !!(onStudyListToggle && wordRootId);

      // Always use combined text length to ensure consistent sizing
      const displayText = arabicWord ? `${arabicWord} ${text}` : text || '';
      // Pass hasBookmark to ensure proper width calculation
      return calculateTooltipPositioning(layout, displayText, screenWidth, true, hasBookmark);
    }, [layout, text, arabicWord, screenWidth, onStudyListToggle, wordRootId]);

    // Memoize container style
    const containerStyle = useMemo(
      () => ({
        ...STATIC_STYLES.absoluteFull,
        ...STATIC_STYLES.tooltipContainer,
        top: tooltipPositioning.tooltipTop,
        zIndex: zIndex ?? TOOLTIP_CONSTANTS.Z_INDEX,
        ...LAYOUT.ELEVATION.MEDIUM, // Use design system elevation
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
        zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 1, // Ensure tooltip is above the container
        ...LAYOUT.ELEVATION.LARGE, // Use design system elevation
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
        // Removed auto-close timer - tooltip now stays visible until user taps
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
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            zIndex: TOOLTIP_CONSTANTS.Z_INDEX + 2,
            ...LAYOUT.ELEVATION.LARGE,
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: TOOLTIP_CONSTANTS.Z_INDEX }]}
          onPress={handleClose}
        />
        <Animated.View
          style={[containerStyle, opacityStyle as ViewStyle]}
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

// Add display name to the memoized component
WordTooltip.displayName = 'WordTooltip';
