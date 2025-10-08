import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { DictionarySortOption, SortDirection } from '@/hooks/vocabulary/useDictionaryModal';
import { DICTIONARY_SORT_OPTIONS } from '@/hooks/vocabulary/useDictionaryModal';
import { selectionFeedback } from '@/utils/haptics';

interface DictionarySortingHeaderProps {
  currentSort: DictionarySortOption;
  sortDirection: SortDirection;
  onSortChange: (option: DictionarySortOption) => void;
}

/**
 * Header component that displays dictionary sorting controls
 * Designed to be placed above the dictionary word list
 */
const DictionarySortingHeader: FC<DictionarySortingHeaderProps> = ({
  currentSort,
  sortDirection,
  onSortChange,
}) => {
  const colors = useColors();

  const handleSortPress = useCallback(
    (sortField: DictionarySortOption) => () => {
      selectionFeedback();
      onSortChange(sortField);
    },
    [onSortChange]
  );

  return (
    <View style={styles.container}>
      <View style={styles.optionsContainer}>
        {DICTIONARY_SORT_OPTIONS.map(option => {
          const isActive = currentSort === option.key;
          const showDirectionIcon = isActive && sortDirection;

          return (
            <Pressable
              key={option.key}
              style={[
                styles.sortOption,
                {
                  backgroundColor: isActive ? colors.tintBackground : colors.transparent,
                  borderColor: isActive ? colors.tint : colors.borderOverlay,
                },
              ]}
              onPress={handleSortPress(option.key)}
              android_ripple={{
                color: colors.tint,
                radius: MIN_TOUCH_TARGET.MEDIUM / 2,
              }}
            >
              <ThemedText
                type="label"
                weight={isActive ? 'semibold' : 'medium'}
                colorName={isActive ? 'text' : 'secondaryText'}
                style={styles.optionText}
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
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
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
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    gap: LAYOUT.SPACING.TINY,
  },
  optionText: {
    // Tighten vertical alignment with the chevron icon
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  directionIcon: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
});

DictionarySortingHeader.displayName = 'DictionarySortingHeader';

export default memo(DictionarySortingHeader);
