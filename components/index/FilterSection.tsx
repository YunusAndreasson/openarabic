import { JSX, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SectionTitle from '@/components/SectionTitle';
import { LAYOUT } from '@/constants/layout';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';

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
  title: string;
  items: FilterItem[];
  onSelect: (id: number) => void;
}

const CompactNavCard = memo(
  ({ label, count, onPress }: { label: string; count?: number; onPress: () => void }) => {
    const colors = useColors();
    return (
      <View style={compactCardStyles.cardContainer}>
        <BaseCard onPress={onPress} style={compactCardStyles.card} shadowSize="small">
          <View style={compactCardStyles.row}>
            <ThemedText type="body" weight="bold" numberOfLines={1} style={compactCardStyles.label}>
              {label}
            </ThemedText>
            {count !== undefined && (
              <View style={[compactCardStyles.countBadge, { backgroundColor: colors.textOverlay }]}>
                <ThemedText
                  type="caption"
                  style={[compactCardStyles.countText, { color: colors.textTertiary }]}
                  skipDefaultColor
                >
                  {count}
                </ThemedText>
              </View>
            )}
            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={colors.textTertiary}
              style={compactCardStyles.icon}
            />
          </View>
        </BaseCard>
      </View>
    );
  }
);

const compactCardStyles = StyleSheet.create({
  cardContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: 48,
    marginHorizontal: 2,
    justifyContent: 'center',
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
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.XTINY,
    marginLeft: LAYOUT.SPACING.SMALL,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginLeft: LAYOUT.SPACING.MEDIUM,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});

const FilterSection = memo(({ title, items, onSelect }: FilterSectionProps): JSX.Element => {
  return (
    <View style={styles.filterSectionContainer}>
      <SectionTitle title={title} />
      {items.map(item => (
        <CompactNavCard
          key={`${title.toLowerCase()}-${item.id}`}
          label={capitalizeFirstLetter(item.name)}
          count={item.count}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </View>
  );
});

FilterSection.displayName = 'FilterSection';

export default FilterSection;
