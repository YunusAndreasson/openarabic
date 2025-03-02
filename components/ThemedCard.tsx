import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { LAYOUT } from '@/constants/layout';
import * as Haptics from 'expo-haptics';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { CategoryPill } from './CategoryPill';
import { LoadingContainer } from './Loader';

interface ThemedCardProps {
  imageUrl: string;
  title: string;
  category: string;
  author: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  // Image loading handlers
  const handleLoadStart = useCallback(() => {
    setImageLoading(true);
    setImageReady(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setImageLoading(false);
    setImageReady(true);
  }, []);

  const handleError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
    setImageReady(true);
  }, []);

  // Handle press without haptic feedback
  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    }
  }, [onPress]);

  // Memoize styles to prevent new object creation on each render
  const themedStyles = useMemo(() => {
    // Helper function to create a gradient with the card background color
    const createCardGradient = () => {
      // For iOS light mode, we need to create a custom gradient that matches the card background
      if (Platform.OS === 'ios' && !isDarkMode) {
        // Use white color to match the iosLightModeCard style
        return [
          'rgba(255, 255, 255, 0)', // Start with transparent
          'rgba(255, 255, 255, 0.95)', // Mid-fade with high opacity
          'white', // End with pure white to match iosLightModeCard
        ] as readonly [string, string, string];
      }

      // For other platforms/themes, use the default gradient colors
      return [colors.gradientStart, colors.gradientMiddle, colors.gradientEnd] as readonly [
        string,
        string,
        string,
      ];
    };

    return {
      card: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.cardShadow,
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
  }, [colors, isDarkMode]);

  // Apply different styles based on platform and theme to fix light mode artifacts
  const cardStyle = useMemo(() => {
    const baseStyle = [
      styles.card,
      {
        backgroundColor: themedStyles.card.backgroundColor,
        borderColor: themedStyles.card.borderColor,
      },
      isLoading && styles.cardLoading,
    ];

    // Add platform-specific styles to fix light mode artifacts
    if (Platform.OS === 'ios' && !isDarkMode) {
      baseStyle.push(styles.iosLightModeCard as any);
    }

    return baseStyle;
  }, [themedStyles.card, isLoading, isDarkMode]);

  // Memoize the card content to prevent unnecessary re-renders
  const cardContent = useMemo(() => {
    if (isLoading) {
      return (
        <View
          style={[
            styles.loadingCardContainer,
            { backgroundColor: themedStyles.card.backgroundColor },
          ]}
        >
          <LoadingContainer size="small" height={300} />
        </View>
      );
    }

    return (
      <>
        <View style={styles.imageContainer}>
          {/* Loading container */}
          {imageLoading && (
            <View
              style={[
                styles.loadingContainer,
                { backgroundColor: themedStyles.loadingContainer.backgroundColor },
              ]}
            >
              <LoadingContainer size="small" />
            </View>
          )}

          {/* Image */}
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, themedStyles.image]}
            contentFit="cover"
            transition={300}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            cachePolicy="memory-disk"
            placeholder={{ color: themedStyles.loadingContainer.backgroundColor }}
            recyclingKey={imageUrl}
          />

          {/* Image overlay content */}
          {imageReady && (
            <View style={styles.imageOverlayContainer} pointerEvents="none">
              {imageError ? (
                <View style={[styles.errorContainer, { backgroundColor: colors.cardBackground }]}>
                  <ThemedText style={styles.errorText}>Image not available</ThemedText>
                </View>
              ) : (
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
              )}
              <CategoryPill category={category} />
            </View>
          )}
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
  }, [
    isLoading,
    imageError,
    imageLoading,
    imageReady,
    imageUrl,
    title,
    author,
    category,
    colors,
    themedStyles,
  ]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.pressable,
          style,
          pressed && {
            transform: [{ scale: 0.985 }],
            opacity: 0.97,
          },
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${category} article: ${title} by ${author}`}
        accessibilityHint="Opens the article details"
        disabled={isLoading || !imageReady}
        android_ripple={{ color: colors.tint, borderless: false, radius: -5 }}
        pressRetentionOffset={{ top: 20, left: 20, right: 20, bottom: 20 }}
      >
        <View style={cardStyle}>{cardContent}</View>
      </Pressable>
    </View>
  );
}

// Memoize the component to prevent unnecessary rerenders
export default React.memo(ThemedCardComponent);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: LAYOUT.CARD.MARGIN.LARGE,
    marginVertical: LAYOUT.CARD.MARGIN.MEDIUM,
    overflow: 'visible',
  },
  pressable: {
    overflow: 'visible',
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
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
    padding: LAYOUT.CARD.PADDING.LARGE,
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
    padding: LAYOUT.CARD.PADDING.LARGE,
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
});
