import React, { useState, useCallback, useMemo, useRef } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSequence,
  withDelay,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';

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

  // Use Reanimated shared values for all animations
  const cardOpacity = useSharedValue(0); // Start with 0 opacity for fade-in
  const scale = useSharedValue(1);
  const loadingOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Keep track of the current image URL to handle prop changes
  const imageUrlRef = useRef(imageUrl);

  // Cleanup on unmount
  React.useEffect(() => {
    // Initial fade-in animation for the card
    cardOpacity.value = withSequence(
      withDelay(
        50, // Reduced delay for faster initial appearance
        withTiming(1, {
          duration: 300, // Faster fade-in
          easing: Easing.out(Easing.ease),
        })
      )
    );

    return () => {
      isMounted.current = false;
      // Cancel any ongoing animations to prevent memory leaks
      cancelAnimation(cardOpacity);
      cancelAnimation(scale);
      cancelAnimation(loadingOpacity);
      cancelAnimation(contentOpacity);
    };
  }, []);

  // Handle image URL changes
  React.useEffect(() => {
    if (imageUrlRef.current !== imageUrl) {
      imageUrlRef.current = imageUrl;

      // Reset image states when URL changes
      setImageLoading(true);
      setImageError(false);
      setImageReady(false);

      // Reset animations
      loadingOpacity.value = 1;
      contentOpacity.value = 0;
    }
  }, [imageUrl]);

  // Image loading handlers
  const handleLoadStart = useCallback(() => {
    if (!isMounted.current) return;

    setImageLoading(true);
    setImageReady(false);

    // Ensure loading indicator is visible
    loadingOpacity.value = withTiming(1, {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    });

    // Hide content until image is loaded
    contentOpacity.value = withTiming(0, {
      duration: 100,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  const handleLoadEnd = useCallback(() => {
    if (!isMounted.current) return;

    // Fade out loading indicator
    loadingOpacity.value = withTiming(
      0,
      {
        duration: 200,
        easing: Easing.out(Easing.ease),
      },
      () => {
        if (isMounted.current) {
          runOnJS(setImageLoading)(false);
          runOnJS(setImageReady)(true);
        }
      }
    );

    // Fade in content
    contentOpacity.value = withTiming(1, {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
    });
  }, []);

  const handleError = useCallback(() => {
    if (!isMounted.current) return;

    // Fade out loading indicator
    loadingOpacity.value = withTiming(
      0,
      {
        duration: 200,
        easing: Easing.out(Easing.ease),
      },
      () => {
        if (isMounted.current) {
          runOnJS(setImageLoading)(false);
          runOnJS(setImageError)(true);
          runOnJS(setImageReady)(true);
        }
      }
    );

    // Fade in error content
    contentOpacity.value = withTiming(1, {
      duration: 250,
      easing: Easing.inOut(Easing.ease),
    });
  }, []);

  // Handle press with haptic feedback
  const handlePress = useCallback(() => {
    if (onPress) {
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Scale down animation
      scale.value = withTiming(0.98, {
        duration: 100,
        easing: Easing.out(Easing.ease),
      });

      // Platform-specific timing adjustments
      const navigationDelay = Platform.OS === 'ios' ? 50 : 0;

      // Delay navigation slightly to allow animation to start
      setTimeout(() => {
        // Reset scale after navigation
        setTimeout(() => {
          scale.value = withTiming(1, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
        }, 200);

        onPress();
      }, navigationDelay);
    }
  }, [onPress, scale]);

  // Handle press animations
  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.98, {
      duration: 150,
      easing: Easing.out(Easing.ease),
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.ease),
    });
  }, [scale]);

  // Memoize styles to prevent new object creation on each render
  const themedStyles = useMemo(
    () => ({
      card: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.cardShadow,
      },
      loadingContainer: {
        backgroundColor: isDarkMode ? colors.cardBackground : 'rgba(255, 255, 255, 0.85)',
      },
      gradient: {
        colors: [colors.gradientStart, colors.gradientMiddle, colors.gradientEnd] as const,
      },
      categoryBackground: {
        backgroundColor: isDarkMode ? colors.tint + '20' : colors.tint + '90',
      },
      category: {
        color: isDarkMode ? colors.tint : colors.white,
        fontWeight: '600',
      },
      author: {
        color: colors.authorText,
      },
      image: {
        backgroundColor: isDarkMode ? colors.imagePlaceholder : 'transparent',
      },
    }),
    [colors, isDarkMode]
  );

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

  // Create animated style for the card
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  // Create animated style for the content
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

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
          {/* Always render the loading container, control visibility with opacity */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                backgroundColor: themedStyles.loadingContainer.backgroundColor,
                opacity: loadingOpacity,
              },
            ]}
          >
            <LoadingContainer size="small" />
          </Animated.View>

          {/* Pre-render the image with opacity 0 to start loading early */}
          <Image
            source={imageUrl}
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

          {/* Animated container for content that appears after image loads */}
          <Animated.View
            style={[styles.imageOverlayContainer, contentAnimatedStyle]}
            pointerEvents="none"
          >
            {imageError ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.cardBackground }]}>
                <ThemedText style={styles.errorText}>Image not available</ThemedText>
              </View>
            ) : (
              <LinearGradient
                colors={themedStyles.gradient.colors}
                style={styles.gradient}
                locations={[0, 0.5, 1]}
              />
            )}
            <CategoryPill category={category} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
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
        </Animated.View>
      </>
    );
  }, [
    isLoading,
    imageError,
    imageUrl,
    title,
    author,
    category,
    colors,
    themedStyles,
    loadingOpacity,
    contentAnimatedStyle,
  ]);

  return (
    <Animated.View style={[styles.animatedContainer, cardAnimatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pressable, style]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${category} article: ${title} by ${author}`}
        accessibilityHint="Opens the article details"
        disabled={isLoading || !imageReady}
      >
        <View style={cardStyle}>{cardContent}</View>
      </Pressable>
    </Animated.View>
  );
}

// Memoize the component to prevent unnecessary rerenders
export default React.memo(ThemedCardComponent);

const styles = StyleSheet.create({
  animatedContainer: {
    marginHorizontal: LAYOUT.CARD.MARGIN.LARGE,
    marginVertical: LAYOUT.CARD.MARGIN.MEDIUM,
    backfaceVisibility: 'hidden',
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
    shadowOpacity: 0.12,
    shadowRadius: 10,
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
});
