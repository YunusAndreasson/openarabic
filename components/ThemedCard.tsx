import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';

import { DEFAULT_IMAGES } from '@/constants/images';
import {
  LAYOUT,
  TYPOGRAPHY_HIERARCHY,
  getEnhancedOpacity,
  useScreenWidth,
} from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import type {
  ThemedCardProps as BaseThemedCardProps,
  ArticleCardProps,
  CompactCardProps,
  BasicCardProps,
} from '@/types/ui/card.types';
import type { ThemeColors } from '@/types/ui/theme.types';
import { withOpacity } from '@/utils/colorUtils';

import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import Pill from './Pill';
import { ThemedText } from './ThemedText';
import { SummaryIndicator } from './home/ArticleHelpers';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 * Enhanced with sophisticated color relationships and micro-typography optimizations.
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
  dueWordsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: LAYOUT.SPACING.TINY,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%', // Only bottom 40% for subtle transition
    zIndex: 10, // Above image but below content
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
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    zIndex: 1,
  },
  loadingComponentContainer: {
    alignItems: 'center',
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
} & (ArticleCardProps | BasicCardProps | CompactCardProps);

// Type guards moved outside component
const isArticleVariant = (p: ThemedCardProps): p is ArticleCardProps =>
  'variant' in p && p.variant === 'article';
const isCompactVariant = (p: ThemedCardProps): p is CompactCardProps =>
  'variant' in p && p.variant === 'compact';

// Loading component moved outside to prevent recreation
const LoadingComponent = ({
  isDarkMode,
  colors,
  style: additionalStyle,
}: {
  isDarkMode: boolean;
  colors: ThemeColors;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    style={[
      styles.loadingComponentContainer,
      additionalStyle,
      { backgroundColor: isDarkMode ? colors.cardBackground : colors.overlay },
    ]}
  >
    <ActivityIndicator color={colors.tint} size="large" />
  </View>
);

function ThemedCardComponent(props: ThemedCardProps): React.JSX.Element {
  const { handlePress, onPress, style, isLoading = false, variant = 'article' } = props;
  const pressHandler = onPress || handlePress;

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const screenWidth = useScreenWidth();
  const imageHeight = useMemo(
    () => Math.round((screenWidth - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    [screenWidth]
  );
  const dynamicStyles = useMemo(
    () => ({
      imageContainer: { height: imageHeight },
      loadingComponentContainer: { height: imageHeight },
    }),
    [imageHeight]
  );
  const isCompact = variant === 'compact';
  const isArticle = variant === 'article';

  const baseColor = colors.background;

  // Memoize gradient colors with balanced intensity for both modes
  const gradientColors = useMemo(() => {
    if (isDarkMode) {
      // Dark mode gradient with similar intensity to light mode
      return [
        withOpacity(baseColor, 0),
        withOpacity(baseColor, 0.5),
        withOpacity(baseColor, 0.9),
        colors.card,
      ] as const;
    } else {
      // Light mode: no gradient (completely transparent)
      return ['transparent', 'transparent', 'transparent', 'transparent'] as const;
    }
  }, [baseColor, colors.card, isDarkMode]);

  // Simple gradient props - same positioning for both modes
  const gradientProps = useMemo(
    () => ({
      colors: gradientColors,
      start: { x: 0, y: 0.1 },
      end: { x: 0, y: 1.0 },
      pointerEvents: 'none' as const,
    }),
    [gradientColors]
  );

  // Enhanced text styles with semantic colors and sophisticated typography
  const titleStyle = useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.LARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.lineHeightMultiplier,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const authorStyle = useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.AUTHOR_BYLINE.letterSpacing,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const summaryStyle = useMemo(
    () => ({
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.SMALL * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
      letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY, isDarkMode),
    }),
    [isDarkMode]
  );

  const metadataStyle = useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.MEDIUM,
      letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.METADATA.letterSpacing,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.TERTIARY, isDarkMode),
    }),
    [isDarkMode]
  );

  // Enhanced due words style with accent color
  const dueWordsStyle = useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
      letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.ACCENT, isDarkMode, true),
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

  const hideDifficulty = isCompactVariant(props) ? props.hideDifficulty : false;
  const lastOpenedAt = isCompactVariant(props) ? props.lastOpenedAt : undefined;

  // Memoize article content with enhanced typography
  const articleContent = useMemo(() => {
    if (!isArticle) return null;
    return (
      <>
        <View style={[styles.imageContainer, dynamicStyles.imageContainer]}>
          <EnhancedImage
            allowDownscaling={false}
            alt={`Image for ${title || 'Article'}`}
            blurRadius={0}
            cachePolicy="memory-disk"
            contentFit="cover"
            prefetch={true}
            priority="high"
            skipTransition={true}
            style={styles.image}
            placeholder={
              (isArticleVariant(props) ? props.placeholder : undefined) || {
                thumbhash: DEFAULT_IMAGES.ARTICLE_PLACEHOLDER_THUMBHASH,
              }
            }
            source={isArticleVariant(props) ? props.imageUrl : DEFAULT_IMAGES.ARTICLE_PLACEHOLDER}
          />

          <LinearGradient {...gradientProps} style={styles.gradient} />
        </View>

        {category ? (
          <View style={styles.pillContainer}>
            <Pill id={category} label={category} variant="category" />
          </View>
        ) : null}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText
              colorName="headingText"
              numberOfLines={2}
              style={titleStyle}
              type="heading3"
            >
              {title}
            </ThemedText>
          </View>

          {author || (isArticleVariant(props) && props.categoryForDisplay) ? (
            <View style={styles.authorContainer}>
              <ThemedText colorName="authorText" numberOfLines={1} style={authorStyle} type="label">
                {[author, isArticleVariant(props) ? props.categoryForDisplay : undefined]
                  .filter(Boolean)
                  .join(' • ')}
              </ThemedText>
            </View>
          ) : null}

          {summary ? (
            <View style={styles.summaryContainer}>
              <ThemedText
                colorName="captionText"
                type="caption"
                {...(!props.fullSummary ? { numberOfLines: 3 } : {})}
                style={summaryStyle}
              >
                {summary}
              </ThemedText>
            </View>
          ) : null}

          {/* Enhanced due word count indicator for article variant */}
          {isArticleVariant(props) && props.dueWordCount ? (
            <View style={styles.dueWordsContainer}>
              <Ionicons color={colors.warning} name="sync-outline" size={14} />
              <ThemedText
                skipDefaultColor
                colorName="warning"
                type="caption"
                style={[
                  dueWordsStyle,
                  {
                    marginLeft: LAYOUT.SPACING.TINY,
                  },
                ]}
              >
                {props.dueWordCount} due {props.dueWordCount === 1 ? 'word' : 'words'}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </>
    );
  }, [
    isArticle,
    title,
    isArticleVariant(props) ? props.imageUrl : undefined,
    isArticleVariant(props) ? props.placeholder : undefined,
    props.fullSummary,
    category,
    author,
    summary,
    isArticleVariant(props) ? props.dueWordCount : undefined,
    gradientProps,
    titleStyle,
    authorStyle,
    summaryStyle,
    dueWordsStyle,
    colors.warning,
  ]);

  // Memoize compact article content with enhanced colors
  const compactArticleContent = useMemo(() => {
    if (!isCompact) return null;
    return (
      <>
        <View style={styles.compactImageContainer}>
          <EnhancedImage
            allowDownscaling={false}
            alt={`Image for ${article?.title || 'Article'}`}
            blurRadius={0}
            contentFit="cover"
            prefetch={true}
            priority="high"
            skipTransition={true}
            source={article?.image_url || ''}
            style={styles.image}
            placeholder={article?.placeholder}
          />

          <LinearGradient {...gradientProps} style={styles.gradient} />
        </View>

        {article?.category ? (
          <View style={styles.pillContainer}>
            <Pill
              id={article.category.id || ''}
              label={article.category.name || ''}
              variant="category"
            />
          </View>
        ) : null}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText
              colorName="headingText"
              numberOfLines={2}
              style={titleStyle}
              type="heading3"
            >
              {article?.title}
            </ThemedText>
          </View>

          {/* Enhanced author information with semantic colors */}
          {article?.author ? (
            <View style={styles.authorContainer}>
              <ThemedText
                colorName="metadataText"
                numberOfLines={1}
                style={metadataStyle}
                type="caption"
              >
                {article.author.name}
              </ThemedText>
            </View>
          ) : null}

          {/* Enhanced due word count indicator with accent styling */}
          {isCompactVariant(props) && props.dueWordCount ? (
            <View style={styles.dueWordsContainer}>
              <Ionicons color={colors.warning} name="sync-outline" size={14} />
              <ThemedText
                skipDefaultColor
                colorName="warning"
                type="caption"
                style={[
                  dueWordsStyle,
                  {
                    marginLeft: LAYOUT.SPACING.TINY,
                  },
                ]}
              >
                {props.dueWordCount} due {props.dueWordCount === 1 ? 'word' : 'words'}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            {isCompactVariant(props) && props.dueWordCount ? null : (
              // Show summary indicator when not showing due words
              <SummaryIndicator summary={article?.summary || null} />
            )}
          </View>
        </View>
      </>
    );
  }, [
    isCompact,
    article,
    isCompactVariant(props) ? props.dueWordCount : undefined,
    hideDifficulty,
    lastOpenedAt,
    gradientProps,
    titleStyle,
    metadataStyle,
    dueWordsStyle,
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
        loadingComponent={
          <LoadingComponent
            colors={colors}
            isDarkMode={isDarkMode}
            style={dynamicStyles.loadingComponentContainer}
          />
        }
        style={[isCompact && styles.compactContainer, style as StyleProp<ViewStyle>]}
        onPress={pressHandler}
      >
        <View />
      </BaseCard>
    );
  }

  return (
    <BaseCard
      includePressAnimation={true}
      style={[isCompact && styles.compactContainer, style as StyleProp<ViewStyle>]}
      onPress={pressHandler}
    >
      {isCompact ? compactContent : articleContent}
    </BaseCard>
  );
}

const ThemedCard = memo(ThemedCardComponent);

export default ThemedCard;
