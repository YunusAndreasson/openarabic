import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { ThemedText } from './ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { LAYOUT } from '@/constants/layout';

interface ThemedCardProps {
  imageUrl: string;
  title: string;
  category: string;
  author: string;
  onPress?: () => void;
}

function ThemedCardComponent({
  imageUrl,
  title,
  category,
  author,
  onPress,
}: ThemedCardProps): React.JSX.Element {
  const colors = useColors();
  const [imageLoading, setImageLoading] = useState(true);

  const handleLoadStart = useCallback(() => setImageLoading(true), []);
  const handleLoadEnd = useCallback(() => setImageLoading(false), []);

  // Memoize styles to prevent new object creation on each render
  const themedStyles = useMemo(
    () => ({
      card: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.text,
      },
      loadingContainer: {
        backgroundColor: colors.cardBackground,
      },
      gradient: {
        colors: ['transparent', 'transparent', colors.cardBackground] as const,
      },
      categoryBackground: {
        backgroundColor: colors.cardBackground,
      },
      category: {
        color: colors.titleText,
      },
      author: {
        color: colors.tabIconDefault,
      },
    }),
    [colors]
  );

  // Memoize pressable style function to prevent unnecessary rerenders
  const getPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.pressable,
      pressed && styles.pressed,
      { shadowColor: themedStyles.card.shadowColor },
    ],
    [themedStyles.card.shadowColor]
  );

  return (
    <Pressable onPress={onPress} style={getPressableStyle}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: themedStyles.card.backgroundColor,
            borderColor: themedStyles.card.borderColor,
          },
        ]}
      >
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
          />
          <LinearGradient
            colors={themedStyles.gradient.colors}
            style={styles.gradient}
            locations={[0, 0.7, 1]}
          />
          <View style={styles.categoryContainer}>
            <BlurView intensity={10} tint="light" style={styles.categoryPill}>
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
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText
            style={[styles.author, { color: themedStyles.author.color }]}
            skipDefaultColor
          >
            {author}
          </ThemedText>
        </View>
      </View>
    </Pressable>
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
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.LARGE,
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
  categoryContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SPACING.MEDIUM,
    overflow: 'hidden',
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  categoryPill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  categoryBackground: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  category: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
});
