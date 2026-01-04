import { BaseCard } from '@/components/common';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { EnhancedImage } from '@/components/ui/EnhancedImage';
import { Pill } from '@/components/ui';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { FONT_WEIGHTS, LAYOUT, SCREEN_WIDTH, TEXT_STYLES } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { ArticleCardProps as BaseArticleCardProps } from '@/types/ui/card.types';
import { handleError } from '@/utils/errorHandling';
import {
  capitalizeFirstLetter,
  getArticleMetadataWithoutCategory,
} from '@/utils/stringUtils';

// Static constants - computed once at module load
const CARD_WIDTH = SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH / 1.618); // Golden ratio
const GRADIENT_HEIGHT = Math.round(IMAGE_HEIGHT * 0.6);

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
    paddingHorizontal: LAYOUT.SPACING.LARGE, // 16px - consistent with image overlay
    paddingTop: LAYOUT.SPACING.TINY, // 4px - tight proximity to overlay meta (Gestalt)
    paddingBottom: LAYOUT.SPACING.LARGE, // 16px - breathing room at card bottom
  },
  gradientOverlay: {
    bottom: 0,
    height: GRADIENT_HEIGHT,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  image: {
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
  overlayTextContainer: {
    bottom: 0,
    gap: LAYOUT.SPACING.TINY, // 4px - tight title/author grouping
    left: 0,
    paddingBottom: LAYOUT.SPACING.SMALL, // 8px - closer to summary below
    paddingHorizontal: LAYOUT.SPACING.LARGE, // 16px - consistent horizontal padding
    position: 'absolute',
    right: 0,
  },
  pillContainer: {
    left: LAYOUT.SPACING.LARGE, // 16px - consistent with overlay text
    maxWidth: '70%',
    position: 'absolute',
    top: LAYOUT.SPACING.LARGE, // 16px - consistent spacing
  },
});

// Typography style for title using constants (2026: bolder, larger headlines)
const TITLE_STYLE = {
  fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, // 24px - larger for hero card prominence
  fontWeight: FONT_WEIGHTS.BOLD, // Bolder for 2026 trend
  letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
  lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
};

/** Article card component optimized for list rendering */
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
}: ArticleCardProps) {
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
          transition={TIMING_CONSTANTS.TRANSITION_DELAY}
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

        <View style={styles.overlayTextContainer}>
          <ThemedText
            colorName="cardOverlayHeading"
            numberOfLines={2}
            style={TITLE_STYLE}
          >
            {title}
          </ThemedText>

          <ThemedText
            colorName="cardOverlayAuthor"
            numberOfLines={1}
            type="label"
          >
            {authorDisplayText}
          </ThemedText>
        </View>
      </View>

      <View style={styles.pillContainer}>
        <Pill id={pillText} label={capitalizedPillText} variant="category" />
      </View>

      <View style={styles.contentContainer}>
        <ThemedText colorName="captionText" type="caption" numberOfLines={4}>
          {summary}
        </ThemedText>
      </View>
    </BaseCard>
  );
}
