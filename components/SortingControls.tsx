import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState, useEffect, useCallback, JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback } from '@/utils/haptics';

import BaseCard from './BaseCard';
import Pill from './Pill';
import { ThemedText } from './ThemedText';

export type SortDirection = 'asc' | 'desc';

export interface SortOption<T = string> {
  key: T;
  label: string;
}

export interface SortingControlsProps<T = string> {
  currentSort: T;
  sortDirection?: SortDirection;
  onSortChange: (sort: T, direction: SortDirection) => void;
  options: SortOption<T>[];
  style?: any;
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
                    borderColor: colors.tint + '25', // Increased opacity for better visibility
                    shadowColor: colors.tint,
                    shadowOffset: { width: 0, height: 2 }, // Slightly more elevation
                    shadowOpacity: 0.15, // Increased shadow
                    shadowRadius: 3, // Larger shadow radius
                    elevation: 3, // Increased Android elevation
                  },
                ]}
                label={
                  <View style={styles.sortPillContent}>
                    <ThemedText
                      type="label"
                      colorName={isSelected ? 'tint' : 'textTertiary'}
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
                    <Ionicons
                      name={
                        isSelected
                          ? internalDirection === 'desc'
                            ? 'chevron-down'
                            : 'chevron-up'
                          : 'chevron-down'
                      }
                      size={isSelected ? 13 : 11} // Larger icon when selected
                      style={[styles.sortPillIcon, isSelected && styles.selectedIcon]}
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
  selectedIcon: {
    opacity: 1, // Full opacity when selected
  },
  selectedLabel: {
    fontWeight: '600',
  },
  sortCard: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    marginHorizontal: 0,
    overflow: 'hidden', // Ensures clean card edges
  },
  sortContent: {
    paddingHorizontal: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.MICRO,
    paddingVertical: LAYOUT.SPACING.XSMALL + LAYOUT.SPACING.MICRO,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.XSMALL,
    justifyContent: 'space-between',
  },
  sortPill: {
    flex: 1,
    marginBottom: 0,
    marginRight: 0,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.XSMALL + LAYOUT.SPACING.MICRO,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL + 1,
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
    gap: LAYOUT.SPACING.XTINY,
  },
  sortPillIcon: {
    marginLeft: LAYOUT.SPACING.MICRO,
    opacity: 0.7, // Subtle when not selected
  },
  sortPillLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 2,
    textAlign: 'center', // Subtle letter spacing for elegance
  },
});
