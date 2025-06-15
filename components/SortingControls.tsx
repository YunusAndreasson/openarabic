import type { JSX } from 'react';
import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { SortDirection, SortOption } from '@/types/ui/sorting.types';
import { selectionFeedback } from '@/utils/haptics';

import BaseCard from './BaseCard';
import Pill from './Pill';
import { ThemedText } from './ThemedText';

export interface SortingControlsProps<T = string> {
  currentSort: T;
  sortDirection?: SortDirection;
  onSortChange: (sort: T, direction: SortDirection) => void;
  options: SortOption<T>[];
  style?: StyleProp<ViewStyle>;
}

function SortingControls<T extends string>({
  currentSort,
  sortDirection = 'desc',
  onSortChange,
  options,
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
      // Add selection haptic feedback
      selectionFeedback();

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

  const getSortHandler = useCallback(
    (key: T) => () => handleSortChange(key),
    [handleSortChange]
  );

  const sortHandlers = useMemo(() => {
    const handlers: Record<T, () => void> = {} as Record<T, () => void>;
    options.forEach(option => {
      handlers[option.key] = getSortHandler(option.key);
    });
    return handlers;
  }, [options, getSortHandler]);

  return (
    <BaseCard shadowSize="small" style={[styles.sortCard, style]}>
      <View style={styles.sortContent}>
        <View style={styles.sortOptions}>
          {options.map(option => {
            const isSelected = currentSort === option.key;
            return (
              <Pill
                key={option.key}
                id={option.key}
                isSelected={isSelected}
                pillBg={colors.transparent}
                variant="filter"
                label={
                  <View style={styles.sortPillContent}>
                    <ThemedText
                      colorName={isSelected ? 'tint' : 'textTertiary'}
                      type="label"
                      weight={isSelected ? 'bold' : 'medium'}
                      style={[
                        styles.sortPillLabel,
                        isSelected && styles.selectedLabel,
                        {
                          fontSize: isSelected
                            ? LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1
                            : LAYOUT.TYPOGRAPHY.SCALE.SMALL,
                        }, // Slightly larger when selected
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                    <ThemedText
                      colorName={isSelected ? 'tint' : 'textTertiary'}
                      type="caption"
                      weight={isSelected ? 'semibold' : 'medium'}
                      style={[
                        styles.sortDirectionLabel,
                        isSelected && styles.selectedDirectionLabel,
                        {
                          fontSize: isSelected ? 11 : 10,
                        },
                      ]}
                    >
                      {isSelected ? (internalDirection === 'desc' ? 'Z-A' : 'A-Z') : 'A-Z'}
                    </ThemedText>
                  </View>
                }
                pillStyle={[
                  styles.sortPill,
                  isSelected && {
                    elevation: 2, // LAYOUT.ELEVATION.SUBTLE equivalent
                    shadowOpacity: 0.15, // LAYOUT.ELEVATION.SUBTLE equivalent
                    shadowRadius: 2, // LAYOUT.ELEVATION.SUBTLE equivalent
                    shadowOffset: { width: 0, height: 1 }, // LAYOUT.ELEVATION.SUBTLE equivalent
                    backgroundColor: colors.elevation1,
                    borderWidth: 1,
                    borderColor: colors.tint + '25', // Increased opacity for better visibility
                    shadowColor: colors.tint,
                  },
                ]}
                onSelect={sortHandlers[option.key]}
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
  selectedLabel: {
    fontWeight: '600',
  },
  sortCard: {
    marginBottom: LAYOUT.SPACING.SMALL,
    marginHorizontal: LAYOUT.SPACING.MICRO,
    overflow: 'hidden', // Ensures clean card edges
  },
  sortContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    justifyContent: 'space-between',
  },
  sortPill: {
    flex: 1,
    marginBottom: 0,
    marginRight: 0,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle default state
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortPillContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
  },
  sortPillLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center', // Subtle letter spacing for elegance
  },
  sortDirectionLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center', // Subtle letter spacing for elegance
  },
  selectedDirectionLabel: {
    fontWeight: '600',
  },
});
