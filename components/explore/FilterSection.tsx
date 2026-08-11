import { Badge, BaseCard } from '@/components/common';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { getCategoryDisplayName, getCategorySubtitle } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  filterSectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: LAYOUT.SPACING.SMALL,
    columnGap: LAYOUT.SPACING.SMALL,
    // Section owns its screen inset (Explore's scroll container is unpadded so
    // rails can bleed full-width) — keeps the grid flush with section labels.
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  // Two-column grid using flexBasis. The 1px deduction keeps rounding-safe so two
  // siblings + an 8px column gap never overflow the parent row.
  gridItem: {
    flexBasis: '49%',
    flexGrow: 1,
    minWidth: 0,
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

function CompactNavCard({
  label,
  subtitle,
  count,
  onPress,
}: {
  label: string;
  subtitle?: string;
  count?: number;
  onPress: () => void;
}) {
  const colors = useColors();

  const subtitleStyle = [compactCardStyles.subtitle, { color: colors.secondaryText }];

  return (
    <BaseCard shadowSize="small" style={compactCardStyles.card} onPress={onPress}>
      <View style={compactCardStyles.row}>
        <View style={compactCardStyles.labelGroup}>
          <ThemedText numberOfLines={1} style={compactCardStyles.label} type="body" weight="bold">
            {label}
          </ThemedText>
          {subtitle && (
            <ThemedText numberOfLines={1} skipDefaultColor style={subtitleStyle} type="caption">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {count !== undefined && (
          <Badge
            backgroundColorName="elevation3"
            colorName="text"
            style={compactCardStyles.countBadge}
          >
            {count}
          </Badge>
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
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelGroup: {
    flex: 1,
    gap: LAYOUT.SPACING.HALF_TINY,
  },
  label: {
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
  },
  subtitle: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
  // Radius, padding and alignment come from `Badge`; this only reserves the
  // width a two-digit count needs and separates it from the label.
  countBadge: {
    marginLeft: LAYOUT.SPACING.SMALL,
    minWidth: MIN_TOUCH_TARGET.SMALL,
  },
});

export function FilterSection({
  items,
  onSelect,
  filterType,
}: FilterSectionProps): JSX.Element | null {
  const handleSelect = (id: number, name?: string) => () => onSelect(id, name, filterType);

  if (!items?.length) {
    return null;
  }

  return (
    <View style={styles.filterSectionContainer}>
      {items.map(item => (
        <View key={`filter-${item.id}`} style={styles.gridItem}>
          <CompactNavCard
            count={item.count}
            label={getCategoryDisplayName(item.name)}
            subtitle={getCategorySubtitle(item.name)}
            onPress={handleSelect(item.id, item.name)}
          />
        </View>
      ))}
    </View>
  );
}

FilterSection.displayName = 'FilterSection';
