import { Ionicons } from '@expo/vector-icons';

import { BaseCard } from '@/components/common/BaseCard';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ICON_CONTAINER, LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { withAlpha } from '@/utils/colorUtils';

interface MetricCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  onPress?: () => void;
}

/**
 * Generic metric card component used for displaying stats.
 * Used in vocabulary stats, streaks, and other metric displays.
 */
export const MetricCard = memo<MetricCardProps>(({ icon, value, label, color, onPress }) => {
  const displayValue = typeof value === 'number' ? Math.round(value).toString() : value;

  return (
    <BaseCard shadowSize="small" style={styles.card} onPress={onPress}>
      <View style={styles.cardWrapper}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: withAlpha(color, LAYOUT.OPACITY.FAINT) },
          ]}
        >
          <Ionicons name={icon} size={LAYOUT.BUTTON.ICON_SIZE.SMALL} color={color} />
        </View>
        <ThemedText type="heading2" style={[styles.value, { color }]}>
          {displayValue}
        </ThemedText>
        <ThemedText
          type="caption"
          colorName="subtleLabelText"
          style={styles.label}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      </View>
    </BaseCard>
  );
});

MetricCard.displayName = 'MetricCard';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    // Note: borderRadius is applied by BaseCard wrapper
  },
  cardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: ICON_CONTAINER.SMALL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
