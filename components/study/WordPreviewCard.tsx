import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface WordPreviewCardProps {
  arabic: string;
  english: string;
  selected?: boolean;
  onPress?: () => void;
}

/**
 * Compact word preview card for empty state.
 * Shows Arabic word and English translation with optional selection state.
 */
export function WordPreviewCard({
  arabic,
  english,
  selected = false,
  onPress,
}: WordPreviewCardProps) {
  const colors = useColors();

  return (
    <BaseCard
      style={[
        styles.card,
        selected && { borderColor: colors.tint, borderWidth: 2 },
        !selected && { opacity: 0.5 },
      ]}
      shadowSize="subtle"
      contentStyle={styles.cardContent}
      onPress={onPress}
    >
      <View style={styles.content}>
        {selected && (
          <View style={[styles.checkmark, { backgroundColor: colors.tint }]}>
            <Ionicons name="checkmark" size={14} color={colors.background} />
          </View>
        )}
        <ThemedText
          type="arabic"
          arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XLARGE}
          weight="semibold"
          numberOfLines={1}
          align="center"
        >
          {arabic}
        </ThemedText>
        <ThemedText
          type="caption"
          variant="secondary"
          numberOfLines={1}
          align="center"
          ellipsizeMode="tail"
        >
          {english}
        </ThemedText>
      </View>
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 100,
    maxWidth: 140,
  },
  cardContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    position: 'relative',
  },
  checkmark: {
    alignItems: 'center',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    bottom: LAYOUT.SPACING.TINY,
    right: LAYOUT.SPACING.TINY,
    width: 24,
  },
  content: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
});
