import { BaseCard } from '@/components/common';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { FONTS } from '@/constants/fonts';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { getCategoryDisplayName, getCategorySubtitle } from '@/utils/stringUtils';

const styles = StyleSheet.create({
  filterSectionContainer: {
    gap: LAYOUT.SPACING.SMALL, // 8px - consistent with Practice screen
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

  const countBadgeStyle = [compactCardStyles.countBadge, { backgroundColor: colors.elevation3 }];
  const countTextStyle = [compactCardStyles.countText, { color: colors.text }];
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
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    textAlign: 'center',
  },
});

export function FilterSection({ items, onSelect, filterType }: FilterSectionProps): JSX.Element | null {
  const handleSelect = (id: number, name?: string) => () => onSelect(id, name, filterType);

  if (!items?.length) {
    return null;
  }

  return (
    <View style={styles.filterSectionContainer}>
      {items.map(item => (
        <CompactNavCard
          key={`filter-${item.id}`}
          count={item.count}
          label={getCategoryDisplayName(item.name)}
          subtitle={getCategorySubtitle(item.name)}
          onPress={handleSelect(item.id, item.name)}
        />
      ))}
    </View>
  );
}

FilterSection.displayName = 'FilterSection';
