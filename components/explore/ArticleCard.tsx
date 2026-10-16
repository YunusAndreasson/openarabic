import { EnhancedImage } from '@/components/ui';
import { BaseCard } from '@/components/common';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, SCREEN_WIDTH, TEXT_STYLES } from '@/constants/layout';
import { getArticleRoute } from '@/constants/routes';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { BaseCardProps } from '@/types/ui/card.types';
import { getArticleMetadata } from '@/utils/stringUtils';

// Static constants - computed once at module load
const CARD_WIDTH = SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;
const IMAGE_HEIGHT = Math.round(CARD_WIDTH / 1.618); // Golden ratio
const GRADIENT_HEIGHT = Math.round(IMAGE_HEIGHT * 0.6);

type ArticleCardProps = Omit<
  BaseCardProps,
  'bordered' | 'contentStyle' | 'disabled' | 'onPress' | 'surface'
> & {
  title: string;
  imageUrl: string;
  summary: string;
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
});

// Typography style for title using constants (2026: bolder, larger headlines)
const TITLE_STYLE = {
  fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, // 24px - larger for hero card prominence
  letterSpacing: TEXT_STYLES.CARD_TITLE.letterSpacing,
  lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LINE_HEIGHT_MULTIPLIERS.TIGHT,
};

/** Article card component optimized for list rendering */
export function ArticleCard({
  title,
  imageUrl,
  summary,
  style,
  testID,
  article,
  isFeaturedArticle = false,
  // The hero article card is the one surface on Explore meant to sit above the
  // feed rather than in it. It used to get this by riding BaseCard's old
  // default, which every other call site overrode back down — so it was never a
  // decision. The horizontal slider steps it back down to `hairline`, which it
  // used to do by spreading a raw elevation token into `style`.
  elevation = 'floating',
}: ArticleCardProps) {
  const colors = useColors();
  const router = useRouter();
  const prefetchArticle = useArticlePrefetch();

  // A native gradient, not a Skia canvas: this card repeats down a list, and a
  // canvas per row is a GPU surface per row for what is a static scrim.
  const gradientStyle = {
    backgroundImage: `linear-gradient(to bottom, ${colors.cardGradient.join(', ')})`,
  };

  // Full metadata: Author · Category · Reading time
  const metadataText = getArticleMetadata(article);

  // Generate article route - featured articles start from beginning
  const articleHref = getArticleRoute(article.id, article.title, isFeaturedArticle);

  const handlePress = useCallback(() => {
    router.push(articleHref);
  }, [router, articleHref]);

  // Warm the detail cache while the press feedback plays
  const handlePressIn = useCallback(() => {
    prefetchArticle(article.id);
  }, [prefetchArticle, article.id]);

  return (
    <BaseCard
      elevation={elevation}
      style={style}
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
    >
      <View style={styles.imageContainer}>
        <EnhancedImage
          style={styles.image}
          source={imageUrl}
          recyclingKey={`article-${article.id}`}
          transition={TIMING_CONSTANTS.TRANSITION_DELAY}
        />
        <View style={[styles.gradientOverlay, gradientStyle]} pointerEvents="none" />

        <View style={styles.overlayTextContainer}>
          <ThemedText
            colorName="cardOverlayHeading"
            numberOfLines={2}
            weight="bold"
            style={TITLE_STYLE}
          >
            {title}
          </ThemedText>

          <ThemedText colorName="cardOverlayAuthor" numberOfLines={1} type="label">
            {metadataText}
          </ThemedText>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <ThemedText colorName="captionText" type="caption" numberOfLines={4}>
          {summary}
        </ThemedText>
      </View>
    </BaseCard>
  );
}
