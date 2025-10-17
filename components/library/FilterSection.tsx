import { BaseCard } from '@common/BaseCard';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';


import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Subtle divider component for elegant section separation
function SubtleDivider() {
  const colors = useColors();

  return (
    <View style={dividerStyles.divider}>
      <View style={[dividerStyles.dividerLine, { backgroundColor: colors.elevation1 }]} />
    </View>
  );
}

SubtleDivider.displayName = 'SubtleDivider';

const dividerStyles = StyleSheet.create({
  divider: {
    alignItems: 'center',
    marginVertical: LAYOUT.SPACING.SMALL,
  },
  dividerLine: {
    height: 1,
    opacity: 0.25, // Even more subtle opacity for elegance
    width: '90%', // Slightly narrower for elegant spacing
  },
});

const styles = StyleSheet.create({
  filterSectionContainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM,
  },
});

interface FilterItem {
  id: number;
  name: string;
  count?: number; // Add optional count for articles
}

interface FilterSectionProps {
  items: FilterItem[];
  onSelect: (id: number, name?: string, filterType?: string) => void;
  filterType?: string; // Optional filter type to pass to onSelect
}

function CompactNavCard({ label, count, onPress }: { label: string; count?: number; onPress: () => void }) {
  const colors = useColors();

  const countBadgeStyle = [compactCardStyles.countBadge, { backgroundColor: colors.elevation3 }];
  const countTextStyle = [compactCardStyles.countText, { color: colors.text }];

  return (
    <BaseCard shadowSize="small" style={compactCardStyles.card} onPress={onPress}>
      <View style={compactCardStyles.row}>
        <ThemedText numberOfLines={1} style={compactCardStyles.label} type="body" weight="bold">
          {capitalizeFirstLetter(label)}
        </ThemedText>
        {count !== undefined && (
          <View style={countBadgeStyle}>
            <ThemedText skipDefaultColor style={countTextStyle} type="caption">
              {count}
            </ThemedText>
          </View>
        )}
      </View>
    </BaseCard>
  );
}

CompactNavCard.displayName = 'CompactNavCard';

const compactCardStyles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
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

export function FilterSection({ items, onSelect, filterType }: FilterSectionProps): JSX.Element {
  const handleSelect = (id: number, name?: string) => () => onSelect(id, name, filterType);

  // Guard against undefined or empty items
  if (!items?.length) {
    return <View style={styles.filterSectionContainer} />;
  }

  return (
    <View style={styles.filterSectionContainer}>
      {items.map(item => (
        <CompactNavCard
          key={`filter-${item.id}`}
          count={item.count}
          label={item.name}
          onPress={handleSelect(item.id, item.name)}
        />
      ))}
    </View>
  );
}

FilterSection.displayName = 'FilterSection';

export { SubtleDivider };
