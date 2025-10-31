import { BaseCard } from '@common/BaseCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { Pill } from '@/components/ui/Pill';
import { SPRING_CONFIG } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { ArticleCardProps as BaseArticleCardProps } from '@/types/ui/card.types';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter, formatAuthorCategory } from '@/utils/stringUtils';

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
  pillLabel?: string; // Optional custom pill label (defaults to category)
  imageUrl: string;
  summary: string;
  title: string;
  article: Article; // Full article object for navigation
  prefetch?: boolean; // Enable prefetching for better performance
  isRelatedArticle?: boolean; // For related articles navigation
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
    top: LAYOUT.SPACING.SMALL,
  },
});

// Static typography styles
const TITLE_STYLE = {
  letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
};

const AUTHOR_STYLE = {
  letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
};

const SUMMARY_STYLE = {
  letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NORMAL,
};

/**
 * High-performance article card component optimized for list rendering
 * Now with Expo Router v6 Link integration for better performance and native feel
 */
export function ArticleCard({
  title,
  author,
  imageUrl,
  category,
  pillLabel,
  summary,
  style,
  testID,
  article,
  prefetch: _prefetch = true,
  isRelatedArticle: _isRelatedArticle = false,
}: ArticleCardProps): JSX.Element {
  const colors = useColors();
  // For mobile-only apps, use constant screen width
  const screenWidth = SCREEN_WIDTH;

  // Press animation
  const { animatedStyle, setValue: _setValue } = useTransformAnimation({
    type: 'scale',
    initialValue: 1,
    targetValue: 1,
    useSpring: true,
    damping: SPRING_CONFIG.RESPONSIVE.damping,
    stiffness: SPRING_CONFIG.RESPONSIVE.stiffness,
  });

  // Image height calculation - screenWidth is stable for mobile
  const imageHeight = Math.round((screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO);

  // Use pre-computed gradient colors from theme for performance
  const gradientColors = colors.cardGradient;

  // Computed values for child components
  const imageContainerStyle = [styles.imageContainer, { height: imageHeight }];

  // Use pillLabel if provided, otherwise use category for the pill
  const pillText = pillLabel ?? category;
  const capitalizedPillText = capitalizeFirstLetter(pillText);
  const authorDisplayText = formatAuthorCategory(author, category);

  // Gradient props
  // OPTIMIZED: Use type assertion instead of spread operator to avoid array allocation
  const gradientProps = {
    colors: gradientColors as unknown as [string, string, ...string[]],
    start: GRADIENT_START_POINT,
    end: GRADIENT_END_POINT,
    style: styles.gradient,
  };

  // Generate article route with proper parameters
  const articleHref = getArticleRoute(article.id, article.title);

  const router = useRouter();

  // Handle navigation with router.push to avoid Link navigation errors
  const handlePress = () => {
    try {
      router.push(articleHref);
    } catch (error) {
      handleError(error as Error, {
        showToast: false,
        analyticsProperties: { articleId: article.id, href: articleHref },
      });
    }
  };

  return (
    <Animated.View style={animatedStyle}>
      <BaseCard style={style} testID={testID} onPress={handlePress}>
        <View style={imageContainerStyle}>
          <EnhancedImage
            style={styles.image}
            source={imageUrl}
            recyclingKey={`article-${article.id}`}
            transition={150} // Fast transition for snappy list scrolling
          />
          <LinearGradient {...gradientProps} />
        </View>

        <View style={styles.pillContainer}>
          <Pill id={pillText} label={capitalizedPillText} variant="category" />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <ThemedText
              colorName="headingText"
              numberOfLines={MAX_TITLE_LINES}
              style={TITLE_STYLE}
              type="heading3"
            >
              {title}
            </ThemedText>

            <ThemedText
              colorName="authorText"
              numberOfLines={MAX_AUTHOR_LINES}
              style={AUTHOR_STYLE}
              type="label"
            >
              {authorDisplayText}
            </ThemedText>

            <ThemedText
              colorName="captionText"
              type="caption"
              style={SUMMARY_STYLE}
              numberOfLines={5}
            >
              {summary}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </Animated.View>
  );
}

ArticleCard.displayName = 'ArticleCard';
