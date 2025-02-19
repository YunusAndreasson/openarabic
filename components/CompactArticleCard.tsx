import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { BlurView } from 'expo-blur';
import type { Article } from '../types/articles.types';

interface CompactArticleCardProps {
  article: Article;
  onPress?: () => void;
}

export function CompactArticleCard({ article, onPress }: CompactArticleCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
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
    marginRight: 12,
    width: 200,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    overflow: 'hidden',
    borderRadius: 6,
  },
  categoryPill: {
    borderRadius: 6,
  },
  categoryBackground: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    opacity: 0.9,
  },
  category: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  contentContainer: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
});
