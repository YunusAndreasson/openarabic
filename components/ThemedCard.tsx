import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Pill from './Pill';
import { LoadingContainer } from './Loader';
import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import { ThemedCardProps, ArticleCardProps, CompactCardProps } from '@/types/ui/card.types';
import { TimeAgo, DifficultyIndicator } from './ArticleHelpers';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 */

const GOLDEN_RATIO_ADJUSTED = 1.5;

function ThemedCardComponent(props: ThemedCardProps): React.JSX.Element {
  // Extract common props
  const { onPress, style, isLoading = false, variant = 'article' } = props;

  // Type guards
  const isArticleVariant = (p: ThemedCardProps): p is ArticleCardProps =>
    'variant' in p && p.variant === 'article';
  const isCompactVariant = (p: ThemedCardProps): p is CompactCardProps =>
    'variant' in p && p.variant === 'compact';

  // Extract variant-specific props based on type
  const title = isArticleVariant(props) ? props.title : undefined;
  const category = isArticleVariant(props) ? props.category : undefined;
  const author = isArticleVariant(props) ? props.author : undefined;
  const summary = isArticleVariant(props) ? props.summary : undefined;
  const children = 'children' in props ? props.children : undefined;

  // Extract compact article props
  const article = isCompactVariant(props) ? props.article : undefined;
  const showTimeAgo = isCompactVariant(props) ? props.showTimeAgo : false;
  const hideDifficultyLabel = isCompactVariant(props) ? props.hideDifficultyLabel : false;
  const hideDifficulty = isCompactVariant(props) ? props.hideDifficulty : false;
  const lastOpenedAt = isCompactVariant(props) ? props.lastOpenedAt : undefined;

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isCompact = variant === 'compact';

  /**
   * Creates a platform and theme-aware gradient for card overlays
   *
   * Create a gradient that perfectly blends with the card background color
   * for a seamless transition between image and content.
   */
  const createCardGradient = () => {
    // Define gradient types as readonly arrays for type safety
    type GradientColors = readonly [string, string, string];

    // Use theme-specific values for better visibility
    if (isDarkMode) {
      return [
        'rgba(0,0,0,0)', // Start transparent
        'rgba(30,30,30,0.85)', // Dark theme mid-fade
        colors.cardBackground, // End with exact card background color
      ] as GradientColors;
    } else {
      return [
        'rgba(255,255,255,0)', // Start transparent
        'rgba(250,250,250,0.85)', // Light theme mid-fade
        colors.cardBackground, // End with exact card background color
      ] as GradientColors;
    }
  };

  // Render loading state
  const renderLoading = () => {
    return (
      <View
        style={[
          styles.loadingComponentContainer,
          { backgroundColor: isDarkMode ? colors.cardBackground : colors.overlay },
        ]}
      >
        <LoadingContainer />
      </View>
    );
  };

  // Render article content
  const renderArticleContent = () => {
    if (!isArticleVariant(props)) return null;
    return (
      <>
        <View style={styles.imageContainer}>
          <EnhancedImage
            source={props.imageUrl}
            style={styles.image}
            onError={() => {
              /* Handle image load error silently */
            }}
            contentFit="cover"
            transition={500}
            showLoadingIndicator={true}
            cachePolicy="memory-disk"
            alt={`Image for ${props.title}`}
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={createCardGradient()}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
          />
        </View>

        {/* Category pill moved outside the image container for consistent positioning */}
        {category && (
          <View style={styles.pillContainer}>
            <Pill id={category} label={category} variant="category" />
          </View>
        )}

        {/* Content container */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text">
              {title}
            </ThemedText>
          </View>

          {/* Author */}
          {author && (
            <View style={styles.authorContainer}>
              <ThemedText type="label" colorName="textSecondary" numberOfLines={1}>
                By {author}
              </ThemedText>
            </View>
          )}

          {/* Summary */}
          {summary && (
            <View style={styles.summaryContainer}>
              <ThemedText type="caption" colorName="textTertiary" numberOfLines={3}>
                {summary}
              </ThemedText>
            </View>
          )}
        </View>
      </>
    );
  };

  // Render compact article content
  const renderCompactArticleContent = () => {
    if (!isCompactVariant(props)) return null;
    return (
      <>
        <View style={styles.compactImageContainer}>
          <EnhancedImage
            source={props.article.image_url || 'https://picsum.photos/800/400'}
            style={styles.image}
            contentFit="cover"
            showLoadingIndicator={true}
            transition={300}
            onError={() => {
              /* Handle image load error silently */
            }}
          />

          {/* Add gradient overlay to compact card for better text contrast */}
          <LinearGradient
            colors={createCardGradient()}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
          />
        </View>

        {/* Render the category pill outside the imageContainer */}
        {props.article.category && (
          <View style={styles.pillContainerCompact}>
            <Pill
              id={props.article.category.id}
              label={props.article.category.name}
              variant="category"
            />
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2} colorName="text">
              {props.article.title}
            </ThemedText>
          </View>

          {props.article.author && (
            <View style={styles.authorContainer}>
              <ThemedText type="label" colorName="textSecondary" numberOfLines={1}>
                By {props.article.author.name}
              </ThemedText>
            </View>
          )}

          <View style={styles.cardFooter}>
            {showTimeAgo ? (
              <TimeAgo
                date={lastOpenedAt || props.article.created_at}
                isLastOpened={!!lastOpenedAt}
              />
            ) : hideDifficulty ? null : (
              <DifficultyIndicator
                level={props.article.difficulty_level}
                hideLabel={hideDifficultyLabel}
              />
            )}
          </View>
        </View>
      </>
    );
  };

  // Render compact content
  const renderCompactContent = () => {
    // If article is provided, render compact article layout
    if (article) {
      return renderCompactArticleContent();
    }

    // Otherwise render custom children
    if (!children) {
      console.warn('ThemedCard: Missing children prop for compact variant');
      return null;
    }

    return children;
  };

  // Render the appropriate content based on variant
  const renderContent = () => {
    if (isCompact) {
      return renderCompactContent();
    }
    return renderArticleContent();
  };

  // If loading, use the BaseCard to show a loading state
  if (isLoading) {
    return (
      <BaseCard
        isLoading={true}
        onPress={onPress}
        style={[isCompact && styles.compactContainer, style as StyleProp<ViewStyle>]}
        loadingComponent={renderLoading()}
      >
        <View />
      </BaseCard>
    );
  }

  // Use the BaseCard with the appropriate content
  return (
    <BaseCard
      onPress={onPress}
      style={[isCompact && styles.compactContainer, style as StyleProp<ViewStyle>]}
      includePressAnimation={true}
    >
      {renderContent()}
    </BaseCard>
  );
}

// Styles
const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    height: Math.round((SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    position: 'relative',
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  compactContainer: {
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 4 + LAYOUT.SPACING.XLARGE,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  compactImageContainer: {
    position: 'relative',
    width: '100%',
    height: Math.round(
      (LAYOUT.BUTTON.HEIGHT.LARGE * 4 + LAYOUT.SPACING.XLARGE) / GOLDEN_RATIO_ADJUSTED
    ),
    zIndex: LAYOUT.Z_INDEX.BASE,
    overflow: 'hidden',
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: LAYOUT.Z_INDEX.OVERLAY,
    height: '200%',
    bottom: -LAYOUT.SPACING.XLARGE * 2,
  },
  pillContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
    maxWidth: '70%',
  },
  pillContainerCompact: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
    maxWidth: '70%',
  },
  contentContainer: {
    padding: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: -LAYOUT.SPACING.MEDIUM,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL - 2,
  },
  summaryContainer: {
    marginTop: LAYOUT.SPACING.SMALL - 2,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  authorContainer: {
    marginTop: 0,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: 0,
  },
  loadingComponentContainer: {
    width: '100%',
    height: Math.round((SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2) / GOLDEN_RATIO_ADJUSTED),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Use memo to prevent unnecessary re-renders
const ThemedCard = React.memo(ThemedCardComponent);

// Export the component
export default ThemedCard;
