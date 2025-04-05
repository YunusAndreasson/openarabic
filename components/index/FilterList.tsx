import { FlashList } from '@shopify/flash-list';
import * as PropTypes from 'prop-types';
import React, { useCallback, useMemo, memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import type { FilterItem, FilterListProps } from '@/types/ui/pill.types';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { capitalizeFirstLetter } from '../../utils/stringUtils';
import Pill from '../Pill';
import SectionTitle from '../SectionTitle';
import { ThemedText } from '../ThemedText';

/**
 * A generic filter list component that can be used for both author and category filters
 */
function FilterListComponent<T extends FilterItem>({
  title,
  items,
  selectedId,
  onSelect,
  onClearFilter,
}: FilterListProps<T>) {
  const colors = useColors();

  // Memoize styles that use colors to prevent new object creation on each render
  const clearButtonStyle = useMemo(
    () => ({ backgroundColor: colors.textOverlay }),
    [colors.textOverlay]
  );

  // Determine if this is a category filter based on the title
  const isCategory = title.toLowerCase().includes('category');

  // Calculate the estimated item size based on the pill width
  const ESTIMATED_ITEM_SIZE = 100; // Approximate width of each filter pill

  // Memoize the keyExtractor for better performance
  const keyExtractor = useCallback((item: T) => `filter-${item.id}`, []);

  // Render each filter item with staggered animation
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: T }) => {
      return (
        <Pill
          id={item.id}
          label={capitalizeFirstLetter(item.name)}
          isSelected={item.id === selectedId}
          onSelect={id => onSelect(Number(id))}
          variant={isCategory ? 'category' : 'filter'}
        />
      );
    },
    [selectedId, onSelect, isCategory]
  );

  // Skip rendering if no items
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionTitle title={title} />
        {selectedId !== null && onClearFilter ? (
          <Pressable
            style={[styles.clearButton, clearButtonStyle]}
            onPress={onClearFilter}
            accessibilityLabel={`Clear ${title.toLowerCase()} filter`}
            accessibilityRole="button"
          >
            <ThemedText type="overline" colorName="tint" skipDefaultColor>
              CLEAR FILTER
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.listContainer}>
        <FlashList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={ESTIMATED_ITEM_SIZE}
          drawDistance={ESTIMATED_ITEM_SIZE * 5}
          overrideItemLayout={layout => {
            layout.size = ESTIMATED_ITEM_SIZE;
          }}
          accessibilityLabel={`List of ${title.toLowerCase()} filters`}
        />
      </View>
    </View>
  );
}

// Define prop types for the component
FilterListComponent.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  onClearFilter: PropTypes.func,
};

const styles = StyleSheet.create({
  clearButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  listContainer: {
    height: 40, // Fixed height for the FlashList container
  },
  listContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
});

// Use generic memo with proper type definition
const FilterList = memo(FilterListComponent) as <T extends FilterItem>(
  props: FilterListProps<T>
) => React.ReactElement | null;

export default FilterList;
