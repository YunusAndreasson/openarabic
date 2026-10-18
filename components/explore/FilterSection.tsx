import { BaseCard } from '@/components/common';
import type { JSX } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, TOPIC_GRID_MIN_COLUMN_WIDTH } from '@/constants/layout';
import { getCategoryDisplayName, getCategorySubtitle } from '@/utils/stringUtils';
import { formatTextCount } from '@/utils/wordCountText';

const COLUMNS = 2;

const styles = StyleSheet.create({
  // Section owns its screen inset (Explore's scroll container is unpadded so
  // rails can bleed full-width) — keeps the grid flush with section labels.
  filterSectionContainer: {
    gap: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
  // Rows are built explicitly rather than left to `flexWrap`. A percentage
  // `flexBasis` cannot account for the column gap: two 49% cells plus an 8pt gap
  // only fit a row wider than 400pt, so on every phone the second cell wrapped
  // and the "grid" drew as a single column twice as tall as intended.
  gridRow: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  // `minWidth: 0` lets long labels wrap instead of widening their column.
  // An odd final row gets an empty cell, so its card keeps the column width.
  gridItem: {
    flex: 1,
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
  // Read in the order that makes sense aloud, with the count given its noun: on
  // its own the number between the two names was just "forty-three".
  const countLabel = count === undefined ? undefined : formatTextCount(count);
  const accessibilityLabel = [label, subtitle, countLabel].filter(Boolean).join(', ');

  return (
    <BaseCard
      accessibilityLabel={accessibilityLabel}
      style={compactCardStyles.card}
      onPress={onPress}
    >
      {/* The count shares the title's line, not the card's full height. Beside
          both lines it took its width out of the subtitle too, and in a
          half-width card that cut "Prophetic Traditions" off mid-word. */}
      <View style={compactCardStyles.titleRow}>
        <ThemedText style={compactCardStyles.label} type="bodyBold">
          {label}
        </ThemedText>
        {count !== undefined && (
          <ThemedText colorName="textTertiary" style={compactCardStyles.count} type="caption">
            {count}
          </ThemedText>
        )}
      </View>
      {/* The ink carries the hierarchy. A local 0.7 opacity on top of it pushed
          the subtitle under AA contrast. */}
      {subtitle && (
        <ThemedText colorName="secondaryText" type="caption">
          {subtitle}
        </ThemedText>
      )}
    </BaseCard>
  );
}

CompactNavCard.displayName = 'CompactNavCard';

const compactCardStyles = StyleSheet.create({
  // BaseCard supplies the radius and the surface; this is only its padding.
  card: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.HALF_TINY,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: LAYOUT.SPACING.SMALL,
  },
  label: {
    flex: 1,
  },
  // Tabular so the counts in a column end on the same edge digit for digit.
  count: {
    fontVariant: ['tabular-nums'],
  },
});

export function FilterSection({
  items,
  onSelect,
  filterType,
}: FilterSectionProps): JSX.Element | null {
  const { width, fontScale } = useWindowDimensions();
  const contentWidth = width - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2;
  const columns =
    (contentWidth - LAYOUT.SPACING.SMALL) / COLUMNS / fontScale >= TOPIC_GRID_MIN_COLUMN_WIDTH
      ? COLUMNS
      : 1;
  const handleSelect = (id: number, name?: string) => () => onSelect(id, name, filterType);

  if (!items?.length) {
    return null;
  }

  const rows: FilterItem[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push(items.slice(start, start + columns));
  }

  return (
    <View style={styles.filterSectionContainer}>
      {rows.map(row => (
        <View key={`filter-row-${row[0]?.id}`} style={styles.gridRow}>
          {row.map(item => (
            <View key={`filter-${item.id}`} style={styles.gridItem}>
              <CompactNavCard
                count={item.count}
                label={getCategoryDisplayName(item.name)}
                subtitle={getCategorySubtitle(item.name)}
                onPress={handleSelect(item.id, item.name)}
              />
            </View>
          ))}
          {row.length < columns && <View style={styles.gridItem} />}
        </View>
      ))}
    </View>
  );
}

FilterSection.displayName = 'FilterSection';
