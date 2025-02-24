import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { LAYOUT } from '@/constants/layout';
import * as Haptics from 'expo-haptics';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

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
        shadowColor: colors.text,
      },
      loadingContainer: {
        backgroundColor: colors.cardBackground,
      },
      gradient: {
        colors: ['transparent', 'rgba(0,0,0,0.05)', colors.cardBackground] as const,
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
        color: colors.tabIconDefault,
      },
    };
  }, [colors, isDarkMode]);

  // Memoize pressable style function to prevent unnecessary rerenders
  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.pressable,
      pressed && styles.pressed,
      { shadowColor: themedStyles.card.shadowColor },
      style,
    ],
    [themedStyles.card.shadowColor, style]
  );

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        onPress={handlePress}
        style={getPressableStyle}
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
            <View style={styles.loadingCardContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
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
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                )}
                <Image
                  source={imageUrl}
                  style={styles.image}
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
                <View style={styles.categoryContainer}>
                  <BlurView
                    intensity={colors.background === '#000000' ? 10 : 0}
                    tint={colors.background === '#000000' ? 'dark' : 'default'}
                    style={styles.categoryPill}
                  >
                    <View
                      style={[
                        styles.categoryBackground,
                        { backgroundColor: themedStyles.categoryBackground.backgroundColor },
                      ]}
                    >
                      <ThemedText
                        style={[styles.category, { color: themedStyles.category.color }]}
                        skipDefaultColor
                      >
                        {category.toUpperCase()}
                      </ThemedText>
                    </View>
                  </BlurView>
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
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Memoize the component to prevent unnecessary rerenders
export default React.memo(ThemedCardComponent);

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: LAYOUT.CARD.MARGIN.LARGE,
    marginVertical: LAYOUT.CARD.MARGIN.MEDIUM,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle placeholder color
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
  categoryContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    overflow: 'hidden',
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    zIndex: LAYOUT.Z_INDEX.CARD,
  },
  categoryPill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  categoryBackground: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  category: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
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
});
