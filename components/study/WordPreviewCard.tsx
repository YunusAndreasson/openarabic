import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

interface WordPreviewCardProps {
  arabic: string;
  english: string;
  selected?: boolean;
  onPress?: () => void;
  style?: object;
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
  style,
}: WordPreviewCardProps) {
  const colors = useColors();

  const handlePress = () => {
    selectionFeedback();
    onPress?.();
  };

  return (
    <BaseCard
      style={[
        styles.card,
        {
          borderWidth: 2,
          borderColor: selected ? colors.tint : 'transparent',
          opacity: selected ? 1 : 0.5,
        },
        style,
      ]}
      shadowSize="subtle"
      contentStyle={styles.cardContent}
      onPress={handlePress}
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
    // Width controlled by parent via style prop for grid layouts
  },
  cardContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    position: 'relative',
  },
  checkmark: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
    position: 'absolute',
    top: -LAYOUT.SPACING.TINY,
    right: -LAYOUT.SPACING.TINY,
    width: LAYOUT.SPACING.XLARGE,
  },
  content: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
});
