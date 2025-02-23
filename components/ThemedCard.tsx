import React, { useState, useCallback } from 'react';
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

export default function ThemedCard({
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

  const themedStyles = {
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
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={[styles.card, themedStyles.card]}>
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={[styles.loadingContainer, themedStyles.loadingContainer]}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          )}
          <Image
            source={imageUrl}
            style={styles.image}
            contentFit="cover"
            transition={300}
            onLoadStart={handleLoadStart}
            onLoad={handleLoadEnd}
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={themedStyles.gradient.colors}
            locations={[0, 0.6, 1]}
            style={styles.gradient}
          />
          <View style={styles.categoryContainer}>
            <BlurView intensity={20} tint="light" style={styles.categoryPill}>
              <View style={[styles.categoryBackground, themedStyles.categoryBackground]}>
                <ThemedText style={[styles.category, themedStyles.category]} skipDefaultColor>
                  {category.toUpperCase()}
                </ThemedText>
              </View>
            </BlurView>
          </View>
        </View>
        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} type="subtitle" numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.authorContainer}>
            <ThemedText style={[styles.author, themedStyles.author]} skipDefaultColor>
              {author}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: LAYOUT.CARD.MARGIN.LARGE,
    marginVertical: LAYOUT.CARD.MARGIN.MEDIUM,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 6,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
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
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: 0.9,
    letterSpacing: 0.2,
  },
});
