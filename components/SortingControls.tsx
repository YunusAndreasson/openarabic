import React, { memo, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import Pill from './Pill';
import BaseCard from './BaseCard';
import { lightFeedback } from '@/utils/haptics';

export type SortOption = 'dueWords' | 'difficulty' | 'readingTime' | 'author' | 'category';

export type SortDirection = 'asc' | 'desc';

export interface SortingControlsProps {
  currentSort: SortOption;
  sortDirection?: SortDirection;
  onSortChange: (sort: SortOption, direction: SortDirection) => void;
}

// 3 most important options that work reliably and match what users see
const sortOptions: {
  key: SortOption;
  label: string;
}[] = [
  { key: 'dueWords', label: 'Due Words' },
  { key: 'difficulty', label: 'Level' },
  { key: 'category', label: 'Category' },
];

const SortingControls = memo(
  ({ currentSort, sortDirection = 'desc', onSortChange }: SortingControlsProps) => {
    const colors = useColors();
    const [internalDirection, setInternalDirection] = useState<SortDirection>(sortDirection);

    // Sync internal direction with prop
    useEffect(() => {
      setInternalDirection(sortDirection);
    }, [sortDirection]);

    const handleSortChange = (sort: SortOption) => {
      // Add haptic feedback
      lightFeedback();

      if (currentSort === sort) {
        // Toggle direction if same sort option
        const newDirection = internalDirection === 'desc' ? 'asc' : 'desc';
        setInternalDirection(newDirection);
        onSortChange(sort, newDirection);
      } else {
        // Change sort option and reset to desc
        setInternalDirection('desc');
        onSortChange(sort, 'desc');
      }
    };

    return (
      <BaseCard shadowSize="small" style={styles.sortCard}>
        <View style={styles.sortContent}>
          {/* Sort Header - H3 with minimal spacing */}
          <ThemedText type="heading3" weight="bold" style={styles.sortTitle}>
            Sort by
          </ThemedText>

          {/* Sort Options */}
          <View style={styles.sortOptions}>
            {sortOptions.map(option => {
              const isSelected = currentSort === option.key;
              return (
                <Pill
                  key={option.key}
                  id={option.key}
                  isSelected={isSelected}
                  onSelect={() => handleSortChange(option.key)}
                  variant="filter"
                  pillBg={colors.transparent}
                  pillStyle={styles.sortPill}
                  label={
                    <View style={styles.sortPillContent}>
                      <ThemedText
                        type="body"
                        colorName={isSelected ? 'tint' : 'textTertiary'}
                        weight={isSelected ? 'bold' : 'medium'}
                        style={styles.sortPillLabel}
                      >
                        {option.label}
                      </ThemedText>
                      <Ionicons
                        name={
                          isSelected
                            ? internalDirection === 'desc'
                              ? 'chevron-down'
                              : 'chevron-up'
                            : 'chevron-down'
                        }
                        size={12}
                        color={isSelected ? colors.tint : colors.textTertiary}
                        style={styles.chevronIcon}
                      />
                    </View>
                  }
                />
              );
            })}
          </View>
        </View>
      </BaseCard>
    );
  }
);

SortingControls.displayName = 'SortingControls';

const styles = StyleSheet.create({
  sortCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: -LAYOUT.SCREEN_EDGE_PADDING,
  },
  sortContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  sortTitle: {
    marginBottom: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.MEDIUM,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
  },
  sortOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: LAYOUT.SPACING.SMALL,
  },
  sortPill: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.XTINY,
  },
  sortPillLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
  },
  chevronIcon: {
    marginLeft: LAYOUT.SPACING.XTINY / 2,
    opacity: 0.8,
  },
});

export default SortingControls;
