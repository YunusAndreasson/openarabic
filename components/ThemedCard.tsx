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
import { ThemedCardProps, ArticleCardProps, CompactCardProps } from '@/types/ui.types';

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

  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const [imageError, setImageError] = useState(false);
  const isCompact = variant === 'compact';

  // Handle image errors
  const handleImageError = () => {
    setImageError(true);
  };

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
            onError={handleImageError}
            contentFit="cover"
            transition={500}
            showLoadingIndicator={true}
            cachePolicy="memory-disk"
            alt={`Image for ${title}`}
          />

          <View style={styles.imageOverlayContainer}>
            <LinearGradient
              colors={createCardGradient()}
              style={[
                styles.gradient,
                Platform.OS === 'ios' && !isDarkMode && styles.iosLightModeGradient,
              ]}
              locations={Platform.OS === 'ios' && !isDarkMode ? [0, 0.85, 0.98] : [0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </View>
        </View>

        {/* Render the category pill outside the imageContainer */}
        {category && (
          <View style={styles.pillContainer}>
            <Pill id={category} label={category} variant="category" />
          </View>
        )}

        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>

          {summary && (
            <ThemedText
              style={[styles.summary, { color: colors.authorText }]}
              numberOfLines={3}
              skipDefaultColor
            >
              {summary}
            </ThemedText>
          )}

          {author && (
            <ThemedText
              style={[styles.author, { color: colors.authorText }]}
              numberOfLines={1}
              skipDefaultColor
            >
              By {author}
            </ThemedText>
          )}
        </View>
      </>
    );
  };

  // Render compact content
  const renderCompactContent = () => {
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
        style={style as StyleProp<ViewStyle>}
        loadingComponent={renderLoading()}
      >
        <View />
      </BaseCard>
    );
  }

  // Use the BaseCard with the appropriate content
  return (
    <BaseCard onPress={onPress} style={style as StyleProp<ViewStyle>}>
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
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  summary: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
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
