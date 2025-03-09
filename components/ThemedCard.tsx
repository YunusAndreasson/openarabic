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
import { useCardAnimation } from '@/hooks/animations';
import { EnhancedImage } from './EnhancedImage';

/**
 * ThemedCard is a reusable card component that can display content in different variants.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 */
interface ThemedCardProps {
  /** URL of the image to display in the card (for article variant) */
  imageUrl?: string;
  /** Title text to display in the card (for article variant) */
  title?: string;
  /** Category text to display in a pill on the card (for article variant) */
  category?: string;
  /** Author name to display in the card (for article variant) */
  author?: string;
  /** Optional callback function when the card is pressed */
  onPress?: () => void;
  /** Optional style to apply to the card container */
  style?: StyleProp<ViewStyle>;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Children to render inside the card (for compact variant) */
  children?: React.ReactNode;
  /** Variant of the card */
  variant?: 'article' | 'compact';
}

function ThemedCardComponent({
  imageUrl,
  title,
  category,
  author,
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

  // Use our animation utility hook instead of manual animation setup
  const { animatedStyle, handlePressIn, handlePressOut } = useCardAnimation();

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
        borderRadius: isCompact ? LAYOUT.BORDER_RADIUS.LARGE : LAYOUT.BORDER_RADIUS.MEDIUM,
        borderWidth: LAYOUT.BORDER.WIDTH.THIN,
        overflow: 'hidden',
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

          {category && <Pill id={category} label={category} variant="category" absolute />}
        </View>

        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>

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
      <Animated.View style={animatedStyle}>
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
              },
              isCompact && styles.compactCard,
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

// Use memo to prevent unnecessary re-renders
const ThemedCard = React.memo(ThemedCardComponent);
export default ThemedCard;

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  pressable: {
    overflow: 'visible',
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  compactCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    padding: LAYOUT.CARD.PADDING.SMALL,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  imageOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 160,
    zIndex: 1,
  },
  contentContainer: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    paddingTop: LAYOUT.SPACING.XXLARGE,
  },
  title: {
    marginBottom: LAYOUT.SPACING.TINY,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    letterSpacing: 0.2,
  },
  iosLightModeGradient: {
    bottom: -8,
    height: 240,
    zIndex: 1,
  },
  loadingComponentContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    overflow: 'hidden',
  },
});
