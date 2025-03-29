import React, { useCallback, useMemo } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import SectionTitle from '../SectionTitle';
import { ThemedText } from '../ThemedText';
import Pill from '../Pill';
import { capitalizeFirstLetter } from '../../utils/stringUtils';
import { FilterItem, FilterListProps } from '@/types/ui/pill.types';

/**
 * A generic filter list component that can be used for both author and category filters
 */
function FilterList<T extends FilterItem>({
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

  // Render each filter item with staggered animation
  const renderItem = useCallback(
    ({ item }: { item: T; index: number }) => {
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
        {selectedId !== null && onClearFilter && (
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
        )}
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={item => `filter-${item.id}`}
        renderItem={renderItem}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        windowSize={5}
        getItemLayout={(_data, index) => ({
          length: 100, // Approximate width of each filter pill
          offset: 100 * index,
          index,
        })}
        accessibilityLabel={`List of ${title.toLowerCase()} filters`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  clearButton: {
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
});

export default FilterList;
