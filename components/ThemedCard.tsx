import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Pressable, StyleProp, ViewStyle, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLoadStart = useCallback(() => setImageLoading(true), []);
  const handleLoadEnd = useCallback(() => setImageLoading(false), []);
  const handleError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [onPress]);

  // Memoize styles to prevent new object creation on each render
  const themedStyles = useMemo(() => {
    return {
      card: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.cardShadow,
      },
      loadingContainer: {
        backgroundColor: colors.cardBackground,
      },
      gradient: {
        colors: [colors.gradientStart, colors.gradientMiddle, colors.gradientEnd] as const,
      },
      categoryBackground: {
        // In dark mode, use a more subtle background
        backgroundColor: isDarkMode ? colors.tint + '20' : colors.tint + '90',
      },
      category: {
        // In dark mode, use the tint color; in light mode, use white for contrast
        color: isDarkMode ? colors.tint : colors.white,
        fontWeight: '600',
      },
      author: {
        color: colors.authorText,
      },
      image: {
        backgroundColor: colors.imagePlaceholder,
      },
    };
  }, [colors, isDarkMode]);

  // Handle press animations
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

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim },
        styles.animatedContainer,
        { transform: [{ scale: scaleAnim }] },
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
        <View
          style={[
            styles.card,
            {
              backgroundColor: themedStyles.card.backgroundColor,
              borderColor: themedStyles.card.borderColor,
            },
            isLoading && styles.cardLoading,
          ]}
        >
          {isLoading ? (
            <View
              style={[
                styles.loadingCardContainer,
                { backgroundColor: themedStyles.card.backgroundColor },
              ]}
            >
              <Loader size="small" />
            </View>
          ) : (
            <>
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View
                    style={[
                      styles.loadingContainer,
                      { backgroundColor: themedStyles.loadingContainer.backgroundColor },
                    ]}
                  >
                    <Loader size="small" color={colors.tint} />
                  </View>
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
                    imageLoading
                      ? undefined
                      : { color: themedStyles.loadingContainer.backgroundColor }
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
          )}
        </View>
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
  },
  pressable: {
    // No margins here as they're now on the animated container
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
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
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
});
