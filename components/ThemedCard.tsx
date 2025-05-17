import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
import type { ThemeColors } from '@/types/ui/theme.types';

import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
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
    minHeight: Math.round(
      (LAYOUT.BUTTON.HEIGHT.LARGE * 4 + LAYOUT.SPACING.XLARGE) / GOLDEN_RATIO_ADJUSTED
    ),
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    zIndex: 1,
    ...Platform.select({
      android: {
        marginTop: 1, // Add a small margin to prevent cutoff
      },
    }),
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
    zIndex: 15,
    ...Platform.select({
      android: {
        paddingBottom: LAYOUT.SPACING.MEDIUM + 4, // Add extra padding at bottom for Android
      },
    }),
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    bottom: 0,
    height: '200%',
    overflow: 'hidden',
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
    marginTop: LAYOUT.SPACING.SMALL,
    position: 'relative',
    zIndex: 20,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
    position: 'relative',
    zIndex: 20,
  },
});

type ThemedCardProps = Omit<BaseThemedCardProps, 'onPress'> & {
  handlePress?: () => void;
  onPress?: () => void;
  fullSummary?: boolean;
} & (ArticleCardProps | CompactCardProps | BasicCardProps);

// Type guards moved outside component
const isArticleVariant = (p: ThemedCardProps): p is ArticleCardProps =>
  'variant' in p && p.variant === 'article';
const isCompactVariant = (p: ThemedCardProps): p is CompactCardProps =>
  'variant' in p && p.variant === 'compact';

// Loading component moved outside to prevent recreation
const LoadingComponent = ({ isDarkMode, colors }: { isDarkMode: boolean; colors: ThemeColors }) => (
  <View
    style={[
      styles.loadingComponentContainer,
      { backgroundColor: isDarkMode ? colors.cardBackground : colors.overlay },
    ]}
  >
    <ActivityIndicator size="large" color={colors.tint} />
  </View>
);

function ThemedCardComponent(props: ThemedCardProps): React.JSX.Element {
  const { handlePress, onPress, style, isLoading = false, variant = 'article' } = props;
  const pressHandler = onPress || handlePress;

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isCompact = variant === 'compact';
  const isArticle = variant === 'article';

  // Extract base colors for gradient
  const baseGradientColor = isDarkMode ? '30,30,30' : '248,249,250';

  // Memoize gradient colors with consistent opacity stops
  const gradientColors = useMemo(() => {
    return [
      `rgba(${baseGradientColor},0)`,
      `rgba(${baseGradientColor},0.95)`,
      `rgba(${baseGradientColor},0.98)`,
      colors.card,
    ] as const;
  }, [baseGradientColor, colors.card]);

  // Common gradient props
  const gradientProps = useMemo(
    () => ({
      colors: gradientColors,
      start: { x: 0, y: 0.3 },
      end: { x: 0, y: 0.8 },
      pointerEvents: 'none' as const,
    }),
    [gradientColors]
  );

  // Common text styles that can be reused
  const titleStyle = useMemo(
    () => ({
      letterSpacing: isDarkMode ? 0.2 : -0.2,
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.3,
      opacity: isDarkMode ? 0.98 : 1,
    }),
    [isDarkMode]
  );

  const summaryStyle = useMemo(
    () => ({
      lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.6,
      opacity: isDarkMode ? 0.95 : 0.9,
      letterSpacing: isDarkMode ? 0.1 : 0,
    }),
    [isDarkMode]
  );

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

  // Memoize article content. Depends only on props used in the view so
  // irrelevant prop changes don't trigger recomputation
  const articleContent = useMemo(() => {
    if (!isArticle) return null;
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
            blurRadius={0}
            allowDownscaling={false}
            priority="high"
            placeholder={
              props.placeholder || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
            prefetch={true}
          />

          <LinearGradient
            {...gradientProps}
            style={[
              styles.gradient,
              {
                bottom: -LAYOUT.SPACING.XLARGE * 2,
                height: '200%',
                transform: [{ scale: 1.01 }],
              },
            ]}
          />
        </View>

        {category ? (
          <View style={styles.pillContainer}>
            <Pill id={category} label={category} variant="category" />
          </View>
        ) : null}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text" style={titleStyle}>
              {title}
            </ThemedText>
          </View>

          {author ? (
            <View style={styles.authorContainer}>
              <ThemedText type="label" colorName="secondaryText" numberOfLines={1}>
                By {author}
              </ThemedText>
            </View>
          ) : null}

          {summary ? (
            <View style={styles.summaryContainer}>
              <ThemedText
                type="caption"
                colorName="secondaryText"
                {...(!props.fullSummary ? { numberOfLines: 3 } : {})}
                style={summaryStyle}
              >
                {summary}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </>
    );
  }, [
    isArticle,
    props.title,
    props.imageUrl,
    props.placeholder,
    props.fullSummary,
    category,
    author,
    summary,
    gradientProps,
    titleStyle,
    summaryStyle,
  ]);

  // Memoize compact article content. Depends only on the compact article props
  // used in the view so unrelated prop changes don't rerender the content
  const compactArticleContent = useMemo(() => {
    if (!isCompact) return null;
    return (
      <>
        <View style={styles.compactImageContainer}>
          <EnhancedImage
            source={props.article.image_url || DEFAULT_IMAGES.ARTICLE_PLACEHOLDER}
            style={styles.image}
            contentFit="cover"
            skipTransition={true}
            blurRadius={0}
            allowDownscaling={false}
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
            {...gradientProps}
            style={[
              styles.gradient,
              {
                bottom: -LAYOUT.SPACING.XLARGE * 2,
                height: '200%',
                transform: [{ scale: 1.01 }],
              },
            ]}
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
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text" style={titleStyle}>
              {props.article.title}
            </ThemedText>
          </View>

          {/* Due word count indicator as simple text with icon */}
          {props.dueWordCount ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: LAYOUT.SPACING.TINY,
              }}
            >
              <Ionicons name="sync-outline" size={14} color={colors.warning} />
              <ThemedText
                type="caption"
                style={{
                  color: colors.warning,
                  fontWeight: '600',
                  fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
                  marginLeft: 4,
                }}
                skipDefaultColor
              >
                {props.dueWordCount} due {props.dueWordCount === 1 ? 'word' : 'words'}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            {showTimeAgo ? (
              <TimeAgo date={lastOpenedAt || props.article.created_at} />
            ) : props.dueWordCount || hideDifficulty ? null : (
              <SummaryIndicator summary={props.article.summary} />
            )}
          </View>
        </View>
      </>
    );
  }, [
    isCompact,
    article,
    props.dueWordCount,
    showTimeAgo,
    hideDifficulty,
    lastOpenedAt,
    gradientProps,
    titleStyle,
    colors.warning,
  ]);

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
