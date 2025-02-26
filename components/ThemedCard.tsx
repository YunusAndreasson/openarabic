import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  StyleProp,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { LAYOUT } from '@/constants/layout';
import * as Haptics from 'expo-haptics';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { CategoryPill } from './CategoryPill';
import { Loader } from './Loader';

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
  const [isRendered, setIsRendered] = useState(false);

  // Animation values using useRef for better performance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Mark component as rendered after initial layout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setIsRendered(true);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Initial fade-in animation
  useEffect(() => {
    fadeAnim.setValue(0);

    Animated.sequence([
      Animated.delay(100),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim]);

  // Image loading handlers
  const handleLoadStart = useCallback(() => {
    setImageLoading(true);
    loadingFadeAnim.setValue(0.5);
    Animated.timing(loadingFadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [loadingFadeAnim]);

  const handleLoadEnd = useCallback(() => {
    Animated.timing(loadingFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) {
        setImageLoading(false);
      }
    });
  }, [loadingFadeAnim]);

  const handleError = useCallback(() => {
    Animated.timing(loadingFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) {
        setImageLoading(false);
        setImageError(true);
      }
    });
  }, [loadingFadeAnim]);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [onPress]);

  // Press animation handlers
  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

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
        backgroundColor: isRendered ? themedStyles.card.backgroundColor : 'transparent',
        borderColor: themedStyles.card.borderColor,
      },
      isLoading && styles.cardLoading,
    ];

    // Add platform-specific styles to fix light mode artifacts
    if (Platform.OS === 'ios' && !isDarkMode) {
      baseStyle.push(styles.iosLightModeCard as any);
    }

    return baseStyle;
  }, [isRendered, themedStyles.card, isLoading, isDarkMode]);

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
          <Loader size="small" />
        </View>
      );
    }

    return (
      <>
        <View style={styles.imageContainer}>
          {imageLoading && (
            <Animated.View
              style={[
                styles.loadingContainer,
                {
                  backgroundColor: themedStyles.loadingContainer.backgroundColor,
                  opacity: loadingFadeAnim,
                },
              ]}
            >
              <Loader size="small" color={colors.tint} />
            </Animated.View>
          )}
          <Image
            source={imageUrl}
            style={[styles.image, themedStyles.image]}
            contentFit="cover"
            transition={300}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            cachePolicy="memory-disk"
            placeholder={
              imageLoading ? undefined : { color: themedStyles.loadingContainer.backgroundColor }
            }
            recyclingKey={imageUrl}
          />
          {imageError && (
            <View style={[styles.errorContainer, { backgroundColor: colors.cardBackground }]}>
              <ThemedText style={styles.errorText}>Image not available</ThemedText>
            </View>
          )}
          <LinearGradient
            colors={themedStyles.gradient.colors}
            style={styles.gradient}
            locations={[0, 0.5, 1]}
          />
          <CategoryPill category={category} />
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
    imageLoading,
    imageError,
    imageUrl,
    title,
    author,
    category,
    colors,
    themedStyles,
    loadingFadeAnim,
    handleLoadStart,
    handleLoadEnd,
    handleError,
  ]);

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.pressable, style]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${category} article: ${title} by ${author}`}
        accessibilityHint="Opens the article details"
        disabled={isLoading}
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
    borderColor: 'transparent',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: 'transparent',
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
