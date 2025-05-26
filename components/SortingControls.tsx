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
                pillStyle={[
                  styles.sortPill,
                  isSelected && {
                    backgroundColor: colors.elevation1,
                    borderWidth: 1,
                    borderColor: colors.tint + '20', // 20% opacity
                  },
                ]}
                label={
                  <View style={styles.sortPillContent}>
                    <ThemedText
                      type="label"
                      colorName={isSelected ? 'tint' : 'textTertiary'}
                      weight={isSelected ? 'bold' : 'semibold'}
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
                        weight={isSelected ? 'medium' : 'normal'}
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
                      size={12}
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
    marginBottom: LAYOUT.SPACING.SMALL,
    marginHorizontal: -LAYOUT.SCREEN_EDGE_PADDING,
  },
  sortContent: {
    padding: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.XTINY,
  },
  sortHeader: {
    marginBottom: LAYOUT.SPACING.XTINY,
  },
  sortTitle: {
    marginBottom: LAYOUT.SPACING.XTINY,
  },
  sortOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.XSMALL,
  },
  sortPill: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.XSMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPillContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MICRO,
  },
  sortPillLabel: {
    fontWeight: '600',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 2,
  },
  sortPillDescription: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    textAlign: 'center',
    opacity: 0.75,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1,
  },
  sortPillIcon: {
    marginTop: LAYOUT.SPACING.MICRO,
  },
});
