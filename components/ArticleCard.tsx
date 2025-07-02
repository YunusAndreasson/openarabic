import { LinearGradient } from 'expo-linear-gradient';
import type { JSX } from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { getEnhancedOpacity, LAYOUT, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { ArticleCardProps as BaseArticleCardProps } from '@/types/ui/card.types';
import { withOpacity } from '@/utils/colorUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import Pill from './Pill';
import { ThemedText } from './ThemedText';

// Extract constants outside component for better performance
const GOLDEN_RATIO = 1.618; // True golden ratio for optimal image-to-content proportions
const GRADIENT_START_POINT = { x: 0, y: 0.1 };
const GRADIENT_END_POINT = { x: 0, y: 1.0 };
const TRANSPARENT_COLOR = 'transparent';
const GRADIENT_HEIGHT_PERCENTAGE = '40%';
const MAX_TITLE_LINES = 2;
const MAX_AUTHOR_LINES = 1;
const PILL_MAX_WIDTH = '70%';

// Simplified interface specifically for ArticleCard (always article variant)
type ArticleCardProps = Omit<BaseArticleCardProps, 'variant'> & {
  author: string;
  category: string;
  categoryForDisplay: string;
  imageUrl: string;
  summary: string;
  title: string;
};

// Custom comparison function for memo optimization
const ArticleCardComparison = (
  prevProps: ArticleCardProps,
  nextProps: ArticleCardProps
): boolean => {
  // Quick path comparisons for most common changes
  if (
    prevProps.title !== nextProps.title ||
    prevProps.author !== nextProps.author ||
    prevProps.imageUrl !== nextProps.imageUrl ||
    prevProps.category !== nextProps.category ||
    prevProps.categoryForDisplay !== nextProps.categoryForDisplay ||
    prevProps.summary !== nextProps.summary ||
    prevProps.onPress !== nextProps.onPress ||
    prevProps.testID !== nextProps.testID
  ) {
    return false;
  }

  // Style comparison (usually stable but check for custom styles)
  if (prevProps.style !== nextProps.style) {
    return false;
  }

  return true;
};

// Static styles object to prevent recreation
const styles = StyleSheet.create({
  authorContainer: {
    flexDirection: 'row' as const,
    marginTop: LAYOUT.SPACING.TINY,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  gradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: GRADIENT_HEIGHT_PERCENTAGE,
  },
  image: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: '100%' as const,
    width: '100%' as const,
  },
  imageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden' as const,
    position: 'relative' as const,
    width: '100%' as const,
  },
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: PILL_MAX_WIDTH,
    position: 'absolute' as const,
    top: LAYOUT.SPACING.MEDIUM,
  },
  summaryContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

// Memoized static typography styles
const createTitleStyle = (isDarkMode: boolean) => ({
  fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
  fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
  letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
  lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
});

const createAuthorStyle = (isDarkMode: boolean) => ({
  fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
  letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
  lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.ACCENT, isDarkMode),
});

const createSummaryStyle = (isDarkMode: boolean) => ({
  fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.REGULAR,
  letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
  lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
});

// Cache for typography styles
const titleStyleCache = new Map<boolean, ReturnType<typeof createTitleStyle>>();
const authorStyleCache = new Map<boolean, ReturnType<typeof createAuthorStyle>>();
const summaryStyleCache = new Map<boolean, ReturnType<typeof createSummaryStyle>>();

/**
 * High-performance article card component optimized for list rendering
 *
 * Performance optimizations:
 * - React.memo with custom comparison function
 * - Memoized expensive style calculations
 * - Static constants extracted outside component
 * - Cached typography styles
 * - Optimized prop handling
 */
function ArticleCardComponent({
  title,
  author,
  imageUrl,
  category,
  categoryForDisplay,
  summary,
  style,
  onPress,
  testID,
}: ArticleCardProps): JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  // For mobile-only apps, use constant screen width
  const screenWidth = SCREEN_WIDTH;

  // Memoize image height calculation with optimized dependencies
  const imageHeight = useMemo(
    () => Math.round((screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO),
    [screenWidth]
  );

  // Memoize gradient colors with better optimization
  const gradientColors = useMemo(() => {
    if (isDarkMode) {
      return [
        withOpacity(colors.background, 0),
        withOpacity(colors.background, 0.5),
        withOpacity(colors.background, 0.9),
        colors.card,
      ] as const;
    }
    return [TRANSPARENT_COLOR, TRANSPARENT_COLOR, TRANSPARENT_COLOR, TRANSPARENT_COLOR] as const;
  }, [colors.background, colors.card, isDarkMode]);

  // Optimized cached typography styles
  const titleStyle = useMemo(() => {
    if (!titleStyleCache.has(isDarkMode)) {
      titleStyleCache.set(isDarkMode, createTitleStyle(isDarkMode));
    }
    return titleStyleCache.get(isDarkMode) ?? createTitleStyle(isDarkMode);
  }, [isDarkMode]);

  const authorStyle = useMemo(() => {
    if (!authorStyleCache.has(isDarkMode)) {
      authorStyleCache.set(isDarkMode, createAuthorStyle(isDarkMode));
    }
    return authorStyleCache.get(isDarkMode) ?? createAuthorStyle(isDarkMode);
  }, [isDarkMode]);

  const summaryStyle = useMemo(() => {
    if (!summaryStyleCache.has(isDarkMode)) {
      summaryStyleCache.set(isDarkMode, createSummaryStyle(isDarkMode));
    }
    return summaryStyleCache.get(isDarkMode) ?? createSummaryStyle(isDarkMode);
  }, [isDarkMode]);

  // Memoize computed values for child components
  const imageContainerStyle = useMemo(
    () => [styles.imageContainer, { height: imageHeight }],
    [imageHeight]
  );

  const capitalizedCategory = useMemo(() => capitalizeFirstLetter(category), [category]);

  const capitalizedCategoryForDisplay = useMemo(
    () => (categoryForDisplay ? capitalizeFirstLetter(categoryForDisplay) : ''),
    [categoryForDisplay]
  );

  const authorDisplayText = useMemo(
    () => `${author} • ${capitalizedCategoryForDisplay}`,
    [author, capitalizedCategoryForDisplay]
  );

  // Memoize gradient props to prevent unnecessary re-renders
  const gradientProps = useMemo(
    () => ({
      colors: gradientColors,
      start: GRADIENT_START_POINT,
      end: GRADIENT_END_POINT,
      style: styles.gradient,
    }),
    [gradientColors]
  );

  return (
    <BaseCard style={style} onPress={onPress} testID={testID}>
      <View style={imageContainerStyle}>
        <EnhancedImage contentFit="cover" style={styles.image} source={imageUrl} />
        <LinearGradient {...gradientProps} />
      </View>

      <View style={styles.pillContainer}>
        <Pill id={category} label={capitalizedCategory} variant="category" />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <ThemedText
            colorName="headingText"
            numberOfLines={MAX_TITLE_LINES}
            style={titleStyle}
            type="heading2"
          >
            {title}
          </ThemedText>
        </View>

        <View style={styles.authorContainer}>
          <ThemedText
            colorName="authorText"
            numberOfLines={MAX_AUTHOR_LINES}
            style={authorStyle}
            type="label"
          >
            {authorDisplayText}
          </ThemedText>
        </View>

        <View style={styles.summaryContainer}>
          <ThemedText colorName="captionText" type="caption" style={summaryStyle}>
            {summary}
          </ThemedText>
        </View>
      </View>
    </BaseCard>
  );
}

const ArticleCard = memo(ArticleCardComponent, ArticleCardComparison);

export default ArticleCard;
