import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_IMAGES } from '@/constants/images';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type {
  ThemedCardProps as BaseThemedCardProps,
  ArticleCardProps,
  CompactCardProps,
  BasicCardProps,
} from '@/types/ui/card.types';

import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import { LoadingContainer } from './Loader';
import Pill from './Pill';
import { ThemedText } from './ThemedText';
import { TimeAgo, SummaryIndicator } from './index/ArticleHelpers';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 */

const GOLDEN_RATIO_ADJUSTED = 1.5;

// Move styles outside component to prevent recreation
const styles = StyleSheet.create({
  authorContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 0,
    marginTop: LAYOUT.SPACING.TINY,
    position: 'relative',
    zIndex: 20,
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 0,
    marginTop: LAYOUT.SPACING.TINY,
  },
  compactContainer: {
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 4 + LAYOUT.SPACING.XLARGE,
  },
  compactImageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: Math.round(
      (LAYOUT.BUTTON.HEIGHT.LARGE * 4 + LAYOUT.SPACING.XLARGE) / GOLDEN_RATIO_ADJUSTED
    ),
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  contentContainer: {
    marginTop: -LAYOUT.SPACING.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
    zIndex: 15,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    bottom: -LAYOUT.SPACING.XLARGE,
    height: '150%',
    zIndex: 5,
  },
  image: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: '100%',
    width: '100%',
    zIndex: 1,
  },
  imageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: Math.round((SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  loadingComponentContainer: {
    alignItems: 'center',
    height: Math.round((SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    justifyContent: 'center',
    width: '100%',
  },
  pillContainer: {
    left: LAYOUT.SPACING.MEDIUM,
    maxWidth: '70%',
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    zIndex: 25,
  },
  summaryContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.SMALL - 2,
    position: 'relative',
    zIndex: 20,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL - 2,
    position: 'relative',
    zIndex: 20,
  },
});

type ThemedCardProps = Omit<BaseThemedCardProps, 'onPress'> & {
  handlePress?: () => void;
  onPress?: () => void;
} & (ArticleCardProps | CompactCardProps | BasicCardProps);

// Type guards moved outside component
const isArticleVariant = (p: ThemedCardProps): p is ArticleCardProps =>
  'variant' in p && p.variant === 'article';
const isCompactVariant = (p: ThemedCardProps): p is CompactCardProps =>
  'variant' in p && p.variant === 'compact';

// Loading component moved outside to prevent recreation
const LoadingComponent = ({ isDarkMode, colors }: { isDarkMode: boolean; colors: any }) => (
  <View
    style={[
      styles.loadingComponentContainer,
      { backgroundColor: isDarkMode ? colors.cardBackground : colors.overlay },
    ]}
  >
    <LoadingContainer />
  </View>
);

function ThemedCardComponent(props: ThemedCardProps): React.JSX.Element {
  const { handlePress, onPress, style, isLoading = false, variant = 'article' } = props;
  const pressHandler = onPress || handlePress;

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isCompact = variant === 'compact';

  // Memoize gradient colors
  const gradientColors = useMemo(() => {
    if (isDarkMode) {
      return ['rgba(0,0,0,0)', 'rgba(30,30,30,0.95)', colors.card] as const;
    }
    return ['rgba(255,255,255,0)', 'rgba(250,250,250,0.95)', colors.card] as const;
  }, [isDarkMode, colors.card]);

  // Extract variant-specific props based on type
  const title = isArticleVariant(props) ? props.title : undefined;
  const category = isArticleVariant(props) ? props.category : undefined;
  const author = isArticleVariant(props) ? props.author : undefined;
  const summary = isArticleVariant(props) ? props.summary : undefined;
  const children = 'children' in props ? props.children : undefined;

  // Extract compact article props
  const article = isCompactVariant(props) ? props.article : undefined;
  const showTimeAgo = isCompactVariant(props) ? props.showTimeAgo : false;
  const hideDifficulty = isCompactVariant(props) ? props.hideDifficulty : false;
  const lastOpenedAt = isCompactVariant(props) ? props.lastOpenedAt : undefined;

  // Memoize article content
  const articleContent = useMemo(() => {
    if (!isArticleVariant(props)) return null;
    return (
      <>
        <View style={styles.imageContainer}>
          <EnhancedImage
            source={props.imageUrl || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER}
            style={styles.image}
            contentFit="cover"
            skipTransition={true}
            cachePolicy="memory-disk"
            alt={`Image for ${props.title}`}
            blurRadius={1}
            priority="high"
            placeholder={
              props.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
            prefetch={true}
          />

          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 0, y: 0.9 }}
            pointerEvents="none"
          />
        </View>

        {category ? (
          <View style={styles.pillContainer}>
            <Pill id={category} label={category} variant="category" />
          </View>
        ) : null}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text">
              {title}
            </ThemedText>
          </View>

          {author ? (
            <View style={styles.authorContainer}>
              <ThemedText type="label" colorName="textTertiary" numberOfLines={1}>
                By {author}
              </ThemedText>
            </View>
          ) : null}

          {summary ? (
            <View style={styles.summaryContainer}>
              <ThemedText
                type="caption"
                colorName={isDarkMode ? 'secondaryText' : 'textTertiary'}
                numberOfLines={3}
                style={{
                  lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.6,
                }}
              >
                {summary}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </>
    );
  }, [props, isDarkMode, gradientColors]);

  // Memoize compact article content
  const compactArticleContent = useMemo(() => {
    if (!isCompactVariant(props)) return null;
    return (
      <>
        <View style={styles.compactImageContainer}>
          <EnhancedImage
            source={props.article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER}
            style={styles.image}
            contentFit="cover"
            skipTransition={true}
            blurRadius={1}
            priority="high"
            placeholder={
              props.article.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
            prefetch={true}
            alt={`Image for ${props.article.title}`}
          />

          <LinearGradient
            colors={gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 0, y: 0.9 }}
            pointerEvents="none"
          />
        </View>

        {props.article.category ? (
          <View style={styles.pillContainer}>
            <Pill
              id={props.article.category.id}
              label={props.article.category.name}
              variant="category"
            />
          </View>
        ) : null}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text">
              {props.article.title}
            </ThemedText>
          </View>

          {props.article.author ? (
            <View style={styles.authorContainer}>
              <ThemedText type="label" colorName="textTertiary" numberOfLines={1}>
                By {props.article.author.name}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            {showTimeAgo ? (
              <TimeAgo date={lastOpenedAt || props.article.created_at} />
            ) : hideDifficulty ? null : (
              <SummaryIndicator summary={props.article.summary} />
            )}
          </View>
        </View>
      </>
    );
  }, [props, gradientColors]);

  // Memoize compact content
  const compactContent = useMemo(() => {
    if (article) {
      return compactArticleContent;
    }
    return children;
  }, [article, compactArticleContent, children]);

  if (isLoading) {
    return (
      <BaseCard
        isLoading={true}
        onPress={pressHandler}
        style={[isCompact && styles.compactContainer, style as StyleProp<ViewStyle>]}
        loadingComponent={<LoadingComponent isDarkMode={isDarkMode} colors={colors} />}
      >
        <View />
      </BaseCard>
    );
  }

  return (
    <BaseCard
      onPress={pressHandler}
      style={[isCompact && styles.compactContainer, style as StyleProp<ViewStyle>]}
      includePressAnimation={true}
    >
      {isCompact ? compactContent : articleContent}
    </BaseCard>
  );
}

const ThemedCard = memo(ThemedCardComponent);

export default ThemedCard;
