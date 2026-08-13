import { BaseCard } from '@/components/common/BaseCard';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';

interface MetricCardProps {
  value: string | number;
  label: string;
  /**
   * Applied to the value only when the colour is DATA — memory health being
   * good/bad. Left undefined for tiles whose colour was decorative, so a row of
   * stats reads as one restrained family instead of a paint chart.
   */
  valueColor?: string;
  onPress?: () => void;
}

/**
 * Generic metric card component used for displaying stats.
 *
 * Stat-tile contract: label on top in subtle ink, value beneath. No icon — in a
 * three-up row on a 375pt iPhone the icon and its gap ate 22pt of a 88pt tile,
 * which is what pushed "Day streak" into an ellipsis. The label is the title;
 * a flame beside it was decoration competing for the space the title needed.
 */
export const MetricCard = memo<MetricCardProps>(({ value, label, valueColor, onPress }) => {
  const displayValue = typeof value === 'number' ? Math.round(value).toString() : value;

  return (
    <BaseCard style={styles.card} onPress={onPress}>
      <View style={styles.cardWrapper}>
        <ThemedText
          type="caption"
          colorName="subtleLabelText"
          style={styles.label}
          numberOfLines={1}
          // Shrink slightly rather than truncate. Without this the tile silently
          // ellipses a title the moment the text gets wider than its share of
          // the row — a longer label, a translation, or the user turning up
          // Dynamic Type. Capping the scale instead would fix the layout by
          // ignoring an accessibility setting; shrinking the one short caption
          // keeps the title readable and whole.
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </ThemedText>
        <ThemedText
          type="heading2"
          skipDefaultColor={valueColor !== undefined}
          style={[styles.value, valueColor !== undefined && { color: valueColor }]}
        >
          {displayValue}
        </ThemedText>
      </View>
    </BaseCard>
  );
});

MetricCard.displayName = 'MetricCard';

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  cardWrapper: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.SMALL,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
  },
  label: {
    alignSelf: 'stretch',
  },
});
