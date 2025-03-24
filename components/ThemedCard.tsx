import React, { useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Pill from './Pill';
import { LoadingContainer } from './Loader';
import BaseCard from './BaseCard';
import { EnhancedImage } from './EnhancedImage';
import { ThemedCardProps } from '@/types/ui.types';
import { TimeAgo, DifficultyIndicator } from './ArticleHelpers';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 */

function ThemedCardComponent(props: ThemedCardProps): React.JSX.Element {
  // Extract common props
  const { onPress, style, isLoading = false, variant = 'article' } = props;

  // Extract variant-specific props
  const imageUrl = 'imageUrl' in props ? props.imageUrl : undefined;
  const title = 'title' in props ? props.title : undefined;
  const category = 'category' in props ? props.category : undefined;
  const author = 'author' in props ? props.author : undefined;
  const summary = 'summary' in props ? props.summary : undefined;
  const children = 'children' in props ? props.children : undefined;

  // Extract compact article props
  const article = 'article' in props ? props.article : undefined;
  const showTimeAgo = 'showTimeAgo' in props ? props.showTimeAgo : false;
  const hideDifficultyLabel = 'hideDifficultyLabel' in props ? props.hideDifficultyLabel : false;
  const hideDifficulty = 'hideDifficulty' in props ? props.hideDifficulty : false;
  const lastOpenedAt = 'lastOpenedAt' in props ? props.lastOpenedAt : undefined;

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const isCompact = variant === 'compact';

  /**
   * Creates a platform and theme-aware gradient for card overlays
   *
   * iOS light mode requires a special gradient that ends with the card background color
   * to ensure proper visual integration with the card.
   *
   * Other platforms/themes use the standard gradient colors from the theme.
   */
  const createCardGradient = () => {
    // Define gradient types as readonly arrays for type safety
    type GradientColors = readonly [string, string, string];

    // For iOS light mode, we need a custom gradient that matches the card background
    if (Platform.OS === 'ios' && !isDarkMode) {
      const iosLightGradient: GradientColors = [
        colors.gradientStart, // Start with transparent
        colors.gradientMiddle, // Mid-fade with high opacity
        colors.cardBackground, // End with card background color
      ];
      return iosLightGradient;
    }

    // For other platforms/themes, use the default gradient colors
    const defaultGradient: GradientColors = [
      colors.gradientStart,
      colors.gradientMiddle,
      colors.gradientEnd,
    ];
    return defaultGradient;
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
    if (!imageUrl || !title || !category) {
      console.warn('ThemedCard: Missing required props for article variant');
      return null;
    }

    return (
      <>
        <View style={styles.imageContainer}>
          <EnhancedImage
            source={imageUrl}
            style={styles.image}
            onError={() => {
              /* Handle image load error silently */
            }}
            contentFit="cover"
            transition={500}
            showLoadingIndicator={true}
            cachePolicy="memory-disk"
            alt={`Image for ${title}`}
          />

          {/* Category pill (moved inside image container) */}
          {category && (
            <View style={styles.pillContainer}>
              <Pill id={category} label={category} variant="category" />
            </View>
          )}

          {/* Gradient overlay */}
          <LinearGradient
            colors={createCardGradient()}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            pointerEvents="none"
          />
        </View>

        {/* Content container */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2}>
              {title}
            </ThemedText>
          </View>

          {/* Author */}
          {author && (
            <View style={styles.authorContainer}>
              <ThemedText type="label" variant="secondary" numberOfLines={1}>
                By {author}
              </ThemedText>
            </View>
          )}

          {/* Summary */}
          {summary && (
            <View style={styles.summaryContainer}>
              <ThemedText type="caption" variant="secondary" numberOfLines={3}>
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
    if (!article) {
      console.warn('ThemedCard: Missing article prop for compact article variant');
      return null;
    }

    return (
      <>
        <View style={styles.compactImageContainer}>
          <EnhancedImage
            source={article.image_url || 'https://picsum.photos/800/400'}
            style={styles.image}
            contentFit="cover"
            showLoadingIndicator={true}
            transition={300}
            onError={() => {
              /* Handle image load error silently */
            }}
          />
        </View>

        {/* Render the category pill outside the imageContainer */}
        {article.category && (
          <View style={styles.pillContainer}>
            <Pill id={article.category.id} label={article.category.name} variant="category" />
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.titleContainer}>
            <ThemedText type="bodyBold" numberOfLines={2}>
              {article.title}
            </ThemedText>
          </View>

          {article.author && (
            <View style={styles.authorContainer}>
              <ThemedText type="label" variant="secondary" numberOfLines={1}>
                By {article.author.name}
              </ThemedText>
            </View>
          )}

          <View style={styles.cardFooter}>
            {showTimeAgo ? (
              <TimeAgo date={lastOpenedAt || article.created_at} isLastOpened={!!lastOpenedAt} />
            ) : hideDifficulty ? null : (
              <DifficultyIndicator
                level={article.difficulty_level}
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
    height: 180,
    position: 'relative',
  },
  compactContainer: {
    width: 220,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  compactImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    zIndex: LAYOUT.Z_INDEX.BASE,
    overflow: 'visible',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  iosLightModeGradient: {
    // Special case for iOS light mode
  },
  pillContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL,
    left: LAYOUT.SPACING.MEDIUM,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
    maxWidth: '70%', // Added to match CompactArticleCard
  },
  contentContainer: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  titleContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  summaryContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
  },
  loadingComponentContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Use memo to prevent unnecessary re-renders
const ThemedCard = React.memo(ThemedCardComponent);

// Export the component
export default ThemedCard;
