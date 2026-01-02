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

// Static constants - computed once at module load
const MAX_TITLE_LINES = 2;
const MAX_AUTHOR_LINES = 1;
const CARD_WIDTH = SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH / GOLDEN_RATIO);
const GRADIENT_HEIGHT = Math.round(IMAGE_HEIGHT * 0.4);

// Enhanced interface for ArticleCard
type ArticleCardProps = Omit<BaseArticleCardProps, 'variant' | 'onPress'> & {
  category: string;
  pillLabel?: string;
  imageUrl: string;
  summary: string;
  title: string;
  article: Article;
  isFeaturedArticle?: boolean;
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  gradientOverlay: {
    bottom: 0,
    height: GRADIENT_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  image: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: '100%',
    width: '100%',
  },
  imageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: '70%',
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
  },
  textContainer: {
    gap: LAYOUT.SPACING.SMALL,
  },
});

const TITLE_STYLE = { letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing };
const AUTHOR_STYLE = { letterSpacing: TEXT_STYLES.AUTHOR_BYLINE.letterSpacing };
const SUMMARY_STYLE = { letterSpacing: LETTER_SPACING.NORMAL };

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
  const router = useRouter();

  const pillText = pillLabel ?? category;
  const capitalizedPillText = capitalizeFirstLetter(pillText);

  const authorDisplayText = getArticleMetadataWithoutCategory(article);

  // Generate article route - featured articles start from beginning
  const articleHref = getArticleRoute(article.id, article.title, isFeaturedArticle);

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
      <View style={styles.imageContainer}>
        <EnhancedImage
          style={styles.image}
          source={imageUrl}
          recyclingKey={`article-${article.id}`}
          transition={150}
        />
        <Canvas style={styles.gradientOverlay} pointerEvents="none">
          <Rect x={0} y={0} width={CARD_WIDTH} height={GRADIENT_HEIGHT}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, GRADIENT_HEIGHT)}
              colors={[...colors.cardGradient]}
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
