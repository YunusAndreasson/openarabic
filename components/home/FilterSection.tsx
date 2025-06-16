import type { JSX } from 'react';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

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
  onSelect: (id: number, name?: string) => void;
}

const CompactNavCard = memo(
  ({ label, count, onPress }: { label: string; count?: number; onPress: () => void }) => {
    const colors = useColors();
    return (
      <BaseCard shadowSize="small" style={compactCardStyles.card} onPress={onPress}>
        <View style={compactCardStyles.row}>
          <ThemedText numberOfLines={1} style={compactCardStyles.label} type="body" weight="bold">
            {capitalizeFirstLetter(label)}
          </ThemedText>
          {count !== undefined && (
            <View style={[compactCardStyles.countBadge, { backgroundColor: colors.elevation3 }]}>
              <ThemedText
                skipDefaultColor
                style={[compactCardStyles.countText, { color: colors.text }]}
                type="caption"
              >
                {count}
              </ThemedText>
            </View>
          )}
        </View>
      </BaseCard>
    );
  }
);

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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.BUTTON.ICON_SIZE.LARGE,
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    width: LAYOUT.BUTTON.ICON_SIZE.LARGE,
  },
  countText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const FilterSection = memo(({ items, onSelect }: FilterSectionProps): JSX.Element => {
  const handleSelect = useCallback(
    (id: number, name?: string) => () => onSelect(id, name),
    [onSelect]
  );

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
});

FilterSection.displayName = 'FilterSection';

export default FilterSection;
