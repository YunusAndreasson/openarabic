import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MetricCard } from '@/components/common/MetricCard';
import { LAYOUT } from '@/constants/layout';
import { useTextLayout } from '@/hooks/ui/useTextLayout';

interface Metric {
  id: string;
  value: string | number;
  label: string;
  accessibilityLabel?: string;
  onPress?: () => void;
}

interface MetricCardGridProps {
  metrics: readonly Metric[];
  density?: 'compact' | 'comfortable';
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Keep short metrics side by side when they fit, and readable when text grows. */
export function MetricCardGrid({ metrics, density, animated, style }: MetricCardGridProps) {
  const { crowded: stacked } = useTextLayout();
  return (
    <View style={[styles.row, stacked && styles.stack, style]}>
      {metrics.map(({ id, ...metric }) => (
        <MetricCard
          key={id}
          {...metric}
          density={density}
          animated={animated}
          style={stacked ? styles.tile : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: LAYOUT.SPACING.SMALL },
  stack: { flexDirection: 'column' },
  tile: { flex: 0 },
});
