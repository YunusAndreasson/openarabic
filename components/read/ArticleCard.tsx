import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import type { JSX } from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import Pill from '@/components/ui/Pill';
import { LAYOUT, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type { Article } from '@/types/articles.types';
import type { ArticleCardProps as BaseArticleCardProps } from '@/types/ui/card.types';
import { withOpacity } from '@/utils/colorUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Extract constants outside component for better performance
const GOLDEN_RATIO = 1.618; // True golden ratio for optimal image-to-content proportions
const GRADIENT_START_POINT = { x: 0, y: 0.1 };
const GRADIENT_END_POINT = { x: 0, y: 1.0 };
const GRADIENT_HEIGHT_PERCENTAGE = '40%';
const MAX_TITLE_LINES = 2;
const MAX_AUTHOR_LINES = 1;
const PILL_MAX_WIDTH_PERCENTAGE = '70%';

// Static style objects to prevent recreation
const IMAGE_STYLE = {
  borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  height: '100%',
  width: '100%',
} as const;

const IMAGE_CONTAINER_STYLE = {
  borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
} as const;

const GRADIENT_STYLE = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  height: GRADIENT_HEIGHT_PERCENTAGE,
} as const;

// Enhanced interface for ArticleCard
type ArticleCardProps = Omit<BaseArticleCardProps, 'variant' | 'onPress'> & {
  author: string;
  category: string;
  categoryForDisplay: string;
  imageUrl: string;
  summary: string;
  title: string;
  article: Article; // Full article object for navigation
  prefetch?: boolean; // Enable prefetching for better performance
  isRelatedArticle?: boolean; // For related articles navigation
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
    prevProps.article.id !== nextProps.article.id ||
    prevProps.prefetch !== nextProps.prefetch ||
    prevProps.isRelatedArticle !== nextProps.isRelatedArticle ||
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
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  textContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  gradient: GRADIENT_STYLE,
  image: IMAGE_STYLE,
  imageContainer: IMAGE_CONTAINER_STYLE,
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: PILL_MAX_WIDTH_PERCENTAGE,
    position: 'absolute' as const,
    top: LAYOUT.SPACING.MEDIUM,
  },
});

// Memoized static typography styles
const createTitleStyle = () => ({
  // Defer to ThemedText heading3 for card titles; keep micro letter-spacing only
  letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
});

const createAuthorStyle = () => ({
  letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
});

const createSummaryStyle = () => ({
  letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
});

/**
 * High-performance article card component optimized for list rendering
 * Now with Expo Router v6 Link integration for better performance and native feel
 */
function ArticleCardComponent({
  title,
  author,
  imageUrl,
  category,
  categoryForDisplay,
  summary,
  style,
  testID,
  article,
  prefetch = true,
  isRelatedArticle = false,
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
    return [
      colors.transparent,
      colors.transparent,
      colors.transparent,
      colors.transparent,
    ] as const;
  }, [colors.background, colors.card, colors.transparent, isDarkMode]);

  const titleStyle = useMemo(() => createTitleStyle(), []);
  const authorStyle = useMemo(() => createAuthorStyle(), []);
  const summaryStyle = useMemo(() => createSummaryStyle(), []);

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

  // Generate article route with proper parameters
  const articleHref = useMemo(
    () => getArticleRoute(article.id, article.title),
    [article.id, article.title]
  );

  // Create the card content component
  const cardContent = useMemo(
    () => (
      <>
        <View style={imageContainerStyle}>
          <EnhancedImage style={styles.image} source={imageUrl} />
          <LinearGradient {...gradientProps} />
        </View>

        <View style={styles.pillContainer}>
          <Pill id={category} label={capitalizedCategory} variant="category" />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <ThemedText
              colorName="headingText"
              numberOfLines={MAX_TITLE_LINES}
              style={titleStyle}
              type="heading3"
            >
              {title}
            </ThemedText>

            <ThemedText
              colorName="authorText"
              numberOfLines={MAX_AUTHOR_LINES}
              style={authorStyle}
              type="label"
            >
              {authorDisplayText}
            </ThemedText>

            <ThemedText colorName="captionText" type="caption" style={summaryStyle}>
              {summary}
            </ThemedText>
          </View>
        </View>
      </>
    ),
    [
      imageContainerStyle,
      imageUrl,
      gradientProps,
      category,
      capitalizedCategory,
      titleStyle,
      title,
      authorStyle,
      authorDisplayText,
      summaryStyle,
      summary,
    ]
  );

  return (
    <Link
      href={articleHref}
      prefetch={prefetch}
      push={!isRelatedArticle}
      dangerouslySingular={true}
    >
      <BaseCard style={style} testID={testID}>
        {cardContent}
      </BaseCard>
    </Link>
  );
}

const ArticleCard = memo(ArticleCardComponent, ArticleCardComparison);

export default ArticleCard;
