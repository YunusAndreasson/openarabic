import { BaseCard } from '@/components/common';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { Pill } from '@/components/ui';
import {
  GOLDEN_RATIO,
  LAYOUT,
  LETTER_SPACING,
  SCREEN_WIDTH,
  TEXT_STYLES,
} from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { ArticleCardProps as BaseArticleCardProps } from '@/types/ui/card.types';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter, getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

// Extract constants outside component for better performance
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

// Enhanced interface for ArticleCard
type ArticleCardProps = Omit<BaseArticleCardProps, 'variant' | 'onPress'> & {
  category: string;
  pillLabel?: string; // Optional custom pill label (defaults to category)
  imageUrl: string;
  summary: string;
  title: string;
  article: Article; // Full article object for navigation
  isFeaturedArticle?: boolean; // For featured articles - disables auto-scroll to reading position
};

// Static styles object to prevent recreation
const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.TINY, // Minimal bottom space (summary capped at 5 lines)
  },
  textContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
  image: IMAGE_STYLE,
  imageContainer: IMAGE_CONTAINER_STYLE,
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: PILL_MAX_WIDTH_PERCENTAGE,
    position: 'absolute' as const,
    top: LAYOUT.SPACING.MEDIUM,
  },
});

// Static typography styles
const TITLE_STYLE = {
  letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
};

const AUTHOR_STYLE = {
  letterSpacing: TEXT_STYLES.AUTHOR_BYLINE.letterSpacing,
};

const SUMMARY_STYLE = {
  letterSpacing: LETTER_SPACING.NORMAL,
};

/**
 * High-performance article card component optimized for list rendering
 * Now with Expo Router v6 Link integration for better performance and native feel
 */
export function ArticleCard({
  title,
  imageUrl,
  category,
  pillLabel,
  summary,
  style,
  testID,
  article,
  isFeaturedArticle = false,
}: ArticleCardProps): JSX.Element {
  const colors = useColors();
  // For mobile-only apps, use constant screen width
  const screenWidth = SCREEN_WIDTH;

  // Image height calculation - screenWidth is stable for mobile
  const imageHeight = Math.round(
    (screenWidth - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2) / GOLDEN_RATIO,
  );

  // Use pre-computed gradient colors from theme for performance
  const gradientColors = colors.cardGradient;

  // Calculate actual card width (accounts for screen padding)
  const cardWidth = screenWidth - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;

  // Computed values for child components
  const imageContainerStyle = [styles.imageContainer, { height: imageHeight }];

  // Calculate gradient overlay dimensions (40% of image height for bottom fade)
  const gradientHeight = Math.round(imageHeight * 0.4);

  // Gradient container style with pixel-perfect dimensions for Skia Canvas
  const gradientContainerStyle = [
    {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: gradientHeight,
    },
  ];

  // Use pillLabel if provided, otherwise use category for the pill
  const pillText = pillLabel ?? category;
  const capitalizedPillText = capitalizeFirstLetter(pillText);

  const authorDisplayText = getArticleMetadataWithoutCategory(article);

  // Generate article route with proper parameters
  // Featured articles should start from the beginning, not resume from saved position
  const articleHref = getArticleRoute(article.id, article.title, isFeaturedArticle);

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
    <BaseCard style={style} testID={testID} onPress={handlePress}>
        <View style={imageContainerStyle}>
          <EnhancedImage
            style={styles.image}
            source={imageUrl}
            recyclingKey={`article-${article.id}`}
            transition={150} // Fast transition for snappy list scrolling
          />
          {/* Skia gradient for Android stability and consistent rendering */}
          <Canvas style={gradientContainerStyle} pointerEvents="none">
            <Rect x={0} y={0} width={cardWidth} height={gradientHeight}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, gradientHeight)}
                colors={[...gradientColors]}
              />
            </Rect>
          </Canvas>
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
  );
}

ArticleCard.displayName = 'ArticleCard';
