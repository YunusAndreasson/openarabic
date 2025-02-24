import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { BlurView } from 'expo-blur';
import type { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';

interface CompactArticleCardProps {
  article: Article;
  onPress?: () => void;
}

export function CompactArticleCard({ article, onPress }: CompactArticleCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        { shadowColor: colors.shadow },
      ]}
    >
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.imageContainer}>
          <Image
            source={'https://picsum.photos/800/400'}
            style={styles.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
          {article.category && (
            <View style={styles.categoryContainer}>
              <BlurView intensity={10} tint="light" style={styles.categoryPill}>
                <View style={[styles.categoryBackground, { backgroundColor: colors.background }]}>
                  <ThemedText
                    style={[styles.category, { color: colors.categoryText }]}
                    skipDefaultColor
                  >
                    {article.category.name.toUpperCase()}
                  </ThemedText>
                </View>
              </BlurView>
            </View>
          )}
        </View>
        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {article.title}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: 200,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    zIndex: LAYOUT.Z_INDEX.BASE,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryContainer: {
    position: 'absolute',
    top: LAYOUT.SPACING.SMALL,
    left: LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  categoryPill: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
  },
  categoryBackground: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    opacity: 0.9,
  },
  category: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.5,
  },
  contentContainer: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL,
    fontWeight: '600',
  },
});
