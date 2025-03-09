import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { LAYOUT } from '@/constants/layout';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { CategoryPill } from './CategoryPill';
import { LoadingContainer } from './Loader';
import Animated from 'react-native-reanimated';
import { useCardAnimation } from '../utils/animations';
import { EnhancedImage } from './EnhancedImage';

/**
 * ThemedCard is a reusable card component that displays an image with title, category, and author.
 * It supports both light and dark themes, handles loading states, and provides smooth animations.
 *
 * The component is optimized for performance with memoization and proper image loading handling.
 */
interface ThemedCardProps {
  /** URL of the image to display in the card */
  imageUrl: string;
  /** Title text to display in the card */
  title: string;
  /** Category text to display in a pill on the card */
  category: string;
  /** Author name to display in the card */
  author: string;
  /** Optional callback function when the card is pressed */
  onPress?: () => void;
  /** Optional style to apply to the card container */
  style?: StyleProp<ViewStyle>;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
}

function ThemedCardComponent({
  imageUrl,
  title,
  category,
  author,
  onPress,
  style,
  isLoading = false,
}: ThemedCardProps): React.JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const [imageError, setImageError] = useState(false);

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
        borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
  }, [colors, isDarkMode, style]);

  // Component rendering - update the card wrapper with animation
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingComponentContainer}>
          <LoadingContainer size="small" />
        </View>
      );
    }

    return (
      <>
        <View style={styles.imageContainer}>
          {/* Replace the Image component with our EnhancedImage */}
          <EnhancedImage source={imageUrl} style={styles.image} contentFit="cover" />

          {/* Image overlay content - keep this as is */}
          <View style={styles.imageOverlayContainer} pointerEvents="none">
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
            <CategoryPill category={category} />
          </View>
        </View>

        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {title}
          </ThemedText>
          <ThemedText
            style={[styles.author, { color: themedStyles.author.color }]}
            skipDefaultColor
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {author}
          </ThemedText>
        </View>
      </>
    );
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

// Memoize the component to prevent unnecessary rerenders
export default React.memo(ThemedCardComponent);

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
  iosLightModeCard: {
    backgroundColor: 'white',
    shadowOpacity: LAYOUT.OPACITY.OVERLAY,
    shadowRadius: 8,
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    overflow: 'hidden',
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
  loadingCardContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    overflow: 'hidden',
  },
  cardLoading: {
    opacity: LAYOUT.OPACITY.DIMMED,
    minHeight: 300,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
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
