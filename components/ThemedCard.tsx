import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import Pill from './Pill';
import { LoadingContainer } from './Loader';
import Animated from 'react-native-reanimated';
import { usePressAnimation, useLayoutAnimation, useOpacityAnimation } from '@/hooks/animations';
import { EnhancedImage } from './EnhancedImage';
import { ThemedCardProps } from '@/types/ui.types';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 * It uses Reanimated 3's built-in animations for optimal performance.
 */

function ThemedCardComponent({
  imageUrl,
  title,
  category,
  author,
  summary,
  onPress,
  style,
  isLoading = false,
  children,
  variant = 'article',
}: ThemedCardProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const [imageError, setImageError] = useState(false);
  const isCompact = variant === 'compact';

  // Use our animation utility hook
  const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
    type: 'card',
  });

  // Use the layout animation hook with LinearTransition
  const { layout } = useLayoutAnimation({
    type: 'linear',
    duration: 300,
  });

  // Use our standardized fade-in entrance animation
  const { entering } = useOpacityAnimation({
    style: 'entrance-only',
    delay: 0,
    duration: 300,
  });

  // Handle press
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Memoize styles to prevent new object creation on each render
  const themedStyles = useMemo(() => {
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

    return {
      container: {
        overflow: 'visible',
      },
      pressable: {
        overflow: 'visible',
      },
      card: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.shadow,
        borderRadius: isCompact ? LAYOUT.BORDER_RADIUS.MEDIUM : LAYOUT.BORDER_RADIUS.MEDIUM,
        borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        overflow: 'visible',
        ...LAYOUT.SHADOW.MEDIUM,
      },
      loadingContainer: {
        backgroundColor: isDarkMode ? colors.cardBackground : colors.overlay,
      },
      gradient: {
        colors: createCardGradient(),
      },
      author: {
        color: colors.authorText,
      },
      summary: {
        color: colors.authorText, // Using authorText for summary as it's a secondary text color
      },
      image: {
        backgroundColor: isDarkMode ? colors.imagePlaceholder : 'transparent',
      },
    };
  }, [colors, isDarkMode, isCompact]);

  // Render loading state
  const renderLoading = () => {
    return (
      <View style={[styles.loadingComponentContainer, themedStyles.loadingContainer]}>
        <LoadingContainer />
      </View>
    );
  };

  // Render article content
  const renderArticleContent = () => {
    if (isLoading) {
      return renderLoading();
    }

    if (!imageUrl || !title || !category) {
      console.warn('ThemedCard: Missing required props for article variant');
      return null;
    }

    return (
      <>
        <View style={styles.imageContainer}>
          <EnhancedImage
            source={imageUrl}
            style={[styles.image, themedStyles.image]}
            onError={() => setImageError(true)}
            contentFit="cover"
            transition={500}
            showLoadingIndicator={true}
            cachePolicy="memory-disk"
            alt={`Image for ${title}`}
          />

          <View style={styles.imageOverlayContainer}>
            <LinearGradient
              colors={themedStyles.gradient.colors}
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
              style={[styles.summary, themedStyles.summary]}
              numberOfLines={3}
              skipDefaultColor
            >
              {summary}
            </ThemedText>
          )}

          {author && (
            <ThemedText style={[styles.author, themedStyles.author]} numberOfLines={1}>
              By {author}
            </ThemedText>
          )}
        </View>
      </>
    );
  };

  // Render compact content
  const renderCompactContent = () => {
    if (isLoading) {
      return renderLoading();
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

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle} entering={entering} layout={layout}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: themedStyles.card.backgroundColor,
                borderColor: themedStyles.card.borderColor,
                shadowColor: themedStyles.card.shadowColor,
                borderRadius: themedStyles.card.borderRadius,
                borderWidth: themedStyles.card.borderWidth,
              },
              style,
            ]}
          >
            {renderContent()}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pressable: {
    width: '100%',
  },
  card: {
    width: '100%',
    overflow: 'hidden',
  },
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
    left: LAYOUT.SPACING.SMALL,
    zIndex: LAYOUT.Z_INDEX.OVERLAY + 10,
  },
  contentContainer: {
    padding: LAYOUT.SPACING.MEDIUM,
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Use memo to prevent unnecessary re-renders
const ThemedCard = React.memo(ThemedCardComponent);

// Export the component
export default ThemedCard;
