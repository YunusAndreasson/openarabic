import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ARTICLE_SORT_OPTIONS, useArticleSorting } from '@/hooks/articles/useArticleSorting';
import { useColors } from '@/hooks/theme/useColors';

/**
 * Header component that displays article sorting controls
 * Designed to be placed above article lists for immediate visual feedback
 */
const SortingHeader: FC = () => {
  const colors = useColors();
  const { currentSort, sortDirection, onSortChange } = useArticleSorting();

  const handleSortPress = useCallback(
    (sortField: typeof currentSort) => () => {
      onSortChange(sortField);
    },
    [onSortChange]
  );

  return (
    <View style={[styles.container, { borderBottomColor: colors.borderOverlay }]}>
      <View style={styles.optionsContainer}>
        {ARTICLE_SORT_OPTIONS.map(option => {
          const isActive = currentSort === option.key;
          const showDirectionIcon = isActive && sortDirection;

          return (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                {
                  backgroundColor: isActive ? colors.tintBackground : 'transparent',
                  borderColor: isActive ? colors.tint : colors.border,
                },
              ]}
              onPress={handleSortPress(option.key)}
              android_ripple={{
                color: colors.tint,
                radius: LAYOUT.SPACING.MEDIUM,
              }}
              accessibilityRole="button"
              accessibilityLabel={`Sort by ${option.label}`}
              accessibilityState={{ selected: isActive }}
            >
              <ThemedText
                type="label"
                weight={isActive ? 'semibold' : 'medium'}
                colorName={isActive ? 'tint' : 'text'}
              >
                {option.label}
              </ThemedText>

              {showDirectionIcon && (
                <Ionicons
                  name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={colors.tint}
                  style={styles.directionIcon}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  sortOption: {
    flex: 1, // Equal width for all options
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content within each option
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: 1,
    minHeight: MIN_TOUCH_TARGET.SMALL,
    gap: LAYOUT.SPACING.TINY,
  },
  directionIcon: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
});

SortingHeader.displayName = 'SortingHeader';

export default memo(SortingHeader);
