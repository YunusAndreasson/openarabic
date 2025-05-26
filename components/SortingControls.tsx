import React, { memo, useState, useEffect, useCallback, JSX } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import Pill from './Pill';
import BaseCard from './BaseCard';
import { lightFeedback } from '@/utils/haptics';

export type SortDirection = 'asc' | 'desc';

export interface SortOption<T = string> {
  key: T;
  label: string;
  description?: string;
}

export interface SortingControlsProps<T = string> {
  currentSort: T;
  sortDirection?: SortDirection;
  onSortChange: (sort: T, direction: SortDirection) => void;
  options: SortOption<T>[];
  title?: string;
  style?: any;
}

function SortingControls<T extends string>({
  currentSort,
  sortDirection = 'desc',
  onSortChange,
  options,
  title = 'Sort by',
  style,
}: SortingControlsProps<T>): JSX.Element {
  const colors = useColors();
  const [internalDirection, setInternalDirection] = useState<SortDirection>(sortDirection);

  // Sync internal direction with prop
  useEffect(() => {
    setInternalDirection(sortDirection);
  }, [sortDirection]);

  const handleSortChange = useCallback(
    (sort: T) => {
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
    },
    [currentSort, internalDirection, onSortChange]
  );

  return (
    <BaseCard shadowSize="small" style={[styles.sortCard, style]}>
      <View style={styles.sortContent}>
        {/* Sort Header */}
        <View style={styles.sortHeader}>
          <ThemedText type="heading3" weight="bold" style={styles.sortTitle}>
            {title}
          </ThemedText>
        </View>

        {/* Sort Options */}
        <View style={styles.sortOptions}>
          {options.map(option => {
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
                      type="label"
                      colorName={isSelected ? 'tint' : 'textTertiary'}
                      weight={isSelected ? 'bold' : 'medium'}
                      style={styles.sortPillLabel}
                    >
                      {option.label}
                    </ThemedText>
                    {option.description && (
                      <ThemedText
                        type="caption"
                        style={[
                          styles.sortPillDescription,
                          { color: isSelected ? colors.tint : colors.textTertiary },
                        ]}
                        weight={isSelected ? 'semibold' : 'normal'}
                      >
                        {option.description}
                      </ThemedText>
                    )}
                    <Ionicons
                      name={
                        isSelected
                          ? internalDirection === 'desc'
                            ? 'chevron-down'
                            : 'chevron-up'
                          : 'chevron-down'
                      }
                      size={14}
                      style={styles.sortPillIcon}
                      color={isSelected ? colors.tint : colors.textTertiary}
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

// Create a memoized version with proper generic typing
const MemoizedSortingControls = memo(SortingControls);

export default MemoizedSortingControls;

const styles = StyleSheet.create({
  sortCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: -LAYOUT.SCREEN_EDGE_PADDING,
  },
  sortContent: {
    padding: LAYOUT.SPACING.MEDIUM,
  },
  sortHeader: {
    marginBottom: LAYOUT.SPACING.XSMALL,
  },
  sortTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  sortOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
  sortPill: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPillContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: LAYOUT.SPACING.XTINY,
  },
  sortPillLabel: {
    fontWeight: '500',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    textAlign: 'center',
  },
  sortPillDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 0.5,
    textAlign: 'center',
    opacity: 0.8,
  },
  sortPillIcon: {
    marginTop: LAYOUT.SPACING.XTINY,
  },
});
