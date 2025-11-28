import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { EnhancedImage } from '@/components/EnhancedImage';
import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ArticlePreviewCardProps {
  title: string;
  author: string;
  imageUrl: string;
  selected?: boolean;
  onPress?: () => void;
}

const CARD_WIDTH = 140;
const IMAGE_HEIGHT = 80;

/**
 * Compact article preview card for empty state.
 * Shows thumbnail and title with optional selection state.
 */
export function ArticlePreviewCard({
  title,
  author,
  imageUrl,
  selected = false,
  onPress,
}: ArticlePreviewCardProps) {
  const colors = useColors();

  return (
    <BaseCard
      style={[
        styles.card,
        selected && { borderColor: colors.tint, borderWidth: 2 },
        !selected && { opacity: 0.5 },
      ]}
      shadowSize="subtle"
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <EnhancedImage source={imageUrl} style={styles.image} transition={150} />
        {selected && (
          <View style={[styles.checkmark, { backgroundColor: colors.tint }]}>
            <Ionicons name="checkmark" size={14} color={colors.background} />
          </View>
        )}
      </View>
      <View style={styles.content}>
        <ThemedText type="caption" numberOfLines={2} ellipsizeMode="tail">
          {title}
        </ThemedText>
        <ThemedText
          type="caption"
          variant="secondary"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.author}
        >
          {author}
        </ThemedText>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  author: {
    marginTop: LAYOUT.SPACING.TINY,
  },
  card: {
    width: CARD_WIDTH,
  },
  checkmark: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: LAYOUT.SPACING.SMALL,
    top: LAYOUT.SPACING.SMALL,
    width: 24,
  },
  content: {
    padding: LAYOUT.SPACING.SMALL,
  },
  image: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: '100%',
    width: '100%',
  },
  imageContainer: {
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
});
