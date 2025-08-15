import type { JSX } from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface StatCardProps {
  title: string;
  count: number;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export const StatCard = memo(
  ({ title, count, onPress, disabled = false, testID }: StatCardProps): JSX.Element => {
    const colors = useColors();

    // Memoize dynamic styles for better performance
    const countBadgeStyle = useMemo(
      () => [styles.countBadge, { backgroundColor: colors.elevation3 }],
      [colors.elevation3]
    );

    const countTextStyle = useMemo(() => [styles.countText, { color: colors.text }], [colors.text]);

    return (
      <BaseCard
        shadowSize="small"
        style={styles.card}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
      >
        <View style={styles.row}>
          <ThemedText numberOfLines={1} style={styles.title} type="body" weight="bold">
            {title}
          </ThemedText>
          <View style={countBadgeStyle}>
            <ThemedText skipDefaultColor style={countTextStyle} type="caption">
              {count}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    );
  }
);

StatCard.displayName = 'StatCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    minHeight: MIN_TOUCH_TARGET.SMALL,
    minWidth: MIN_TOUCH_TARGET.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  countText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StatCard;
