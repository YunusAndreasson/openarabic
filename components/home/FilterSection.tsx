import type { JSX } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import SectionTitle from '@/components/SectionTitle';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  filterSectionContainer: {
    // Removed margins - SectionTitle handles all section spacing
  },
});

interface FilterItem {
  id: number;
  name: string;
  count?: number; // Add optional count for articles
}

interface FilterSectionProps {
  title?: string;
  items: FilterItem[];
  onSelect: (id: number, name?: string) => void;
}

const CompactNavCard = memo(
  ({ label, count, onPress }: { label: string; count?: number; onPress: () => void }) => {
    const colors = useColors();
    return (
      <View style={compactCardStyles.cardContainer}>
        <BaseCard shadowSize="small" style={compactCardStyles.card} onPress={onPress}>
          <View style={compactCardStyles.row}>
            <ThemedText numberOfLines={1} style={compactCardStyles.label} type="body" weight="bold">
              {label}
            </ThemedText>
            {count !== undefined && (
              <View style={[compactCardStyles.countBadge, { backgroundColor: colors.textOverlay }]}>
                <ThemedText
                  skipDefaultColor
                  style={[compactCardStyles.countText, { color: colors.textTertiary }]}
                  type="caption"
                >
                  {count}
                </ThemedText>
              </View>
            )}
          </View>
        </BaseCard>
      </View>
    );
  }
);

CompactNavCard.displayName = 'CompactNavCard';

const compactCardStyles = StyleSheet.create({
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    justifyContent: 'center',
    marginHorizontal: 2,
    minHeight: 48,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  cardContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  countBadge: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    minWidth: 24,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  countText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

const FilterSection = memo(({ title, items, onSelect }: FilterSectionProps): JSX.Element => {
  return (
    <View style={styles.filterSectionContainer}>
      {title && <SectionTitle title={title} />}
      {items.map(item => (
        <CompactNavCard
          key={`${title || 'filter'}-${item.id}`}
          count={item.count}
          label={capitalizeFirstLetter(item.name)}
          onPress={() => onSelect(item.id, item.name)}
        />
      ))}
    </View>
  );
});

FilterSection.displayName = 'FilterSection';

export default FilterSection;
