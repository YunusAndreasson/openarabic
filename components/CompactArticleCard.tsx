import React, { useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import type { Article } from '../types/articles.types';
import { LAYOUT } from '../constants/layout';
import { CategoryPill } from './CategoryPill';

interface CompactArticleCardProps {
  article: Article;
  onPress?: () => void;
}

function CompactArticleCardComponent({ article, onPress }: CompactArticleCardProps) {
  const colors = useColors();

  // Memoize styles that depend on colors
  const dynamicStyles = useMemo(
    () => ({
      pressable: {
        shadowColor: colors.shadow,
      },
      card: {
        backgroundColor: colors.cardBackground,
      },
    }),
    [colors.shadow, colors.cardBackground]
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        dynamicStyles.pressable,
      ]}
    >
      <View style={[styles.card, dynamicStyles.card]}>
        <View style={styles.imageContainer}>
          <Image
            source={'https://picsum.photos/800/400'}
            style={styles.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
          {article.category && <CategoryPill category={article.category.name} />}
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

// Memoize the component to prevent unnecessary rerenders
export const CompactArticleCard = React.memo(CompactArticleCardComponent);

const styles = StyleSheet.create({
  pressable: {
    marginRight: LAYOUT.SPACING.SMALL,
    width: 220,
    marginLeft: 0,
  },
  pressed: {
    opacity: LAYOUT.OPACITY.PRESSED,
    transform: [{ scale: 0.98 }],
  },
  card: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 130,
    zIndex: LAYOUT.Z_INDEX.BASE,
  },
  image: {
    width: '100%',
    height: '100%',
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
