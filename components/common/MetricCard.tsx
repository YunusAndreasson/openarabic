import { Ionicons, type IoniconName } from '@/components/ui/Icon';

import { BaseCard } from '@/components/common/BaseCard';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT } from '@/constants/layout';

interface MetricCardProps {
  icon: IoniconName;
  value: string | number;
  label: string;
  color: string;
  onPress?: () => void;
}

/**
 * Generic metric card component used for displaying stats.
 * Stat-tile contract: icon+label row on top (icon carries the semantic
 * color), value beneath in text ink — numbers never wear the status color.
 */
export const MetricCard = memo<MetricCardProps>(({ icon, value, label, color, onPress }) => {
  const displayValue = typeof value === 'number' ? Math.round(value).toString() : value;

  return (
    <BaseCard shadowSize="small" style={styles.card} onPress={onPress}>
      <View style={styles.cardWrapper}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={LAYOUT.TYPOGRAPHY.SCALE.MEDIUM} color={color} />
          <ThemedText
            type="caption"
            colorName="subtleLabelText"
            style={styles.label}
            numberOfLines={1}
          >
            {label}
          </ThemedText>
        </View>
        <ThemedText type="heading2" style={styles.value}>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY + LAYOUT.SPACING.HALF_TINY, // 6px
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
  },
  label: {
    flexShrink: 1,
  },
});
