import React, { useCallback } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import SectionTitle from './SectionTitle';
import { ThemedText } from './ThemedText';
import Pill from './Pill';

interface FilterItem {
  id: number;
  name: string;
  [key: string]: any; // Allow for additional properties
}

interface FilterListProps<T extends FilterItem> {
  /**
   * Title for the filter section
   */
  title: string;

  /**
   * Array of items to display in the filter list
   */
  items: T[];

  /**
   * ID of the currently selected item
   */
  selectedId: number | null;

  /**
   * Callback when an item is selected
   */
  onSelect: (id: number) => void;

  /**
   * Callback when filters are cleared
   */
  onClearFilter?: () => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;

  /**
   * Base animation delay for individual items
   */
  itemAnimationDelay?: number;
}

/**
 * A generic filter list component that can be used for both author and category filters
 */
function FilterList<T extends FilterItem>({
  title,
  items,
  selectedId,
  onSelect,
  onClearFilter,
  animationDelay = 600,
  itemAnimationDelay = 650,
}: FilterListProps<T>) {
  const colors = useColors();

  // Render item function
  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      const isSelected = selectedId === item.id;
      return (
        <Pill
          key={`filter-pill-${item.id}`}
          id={item.id}
          label={item.name}
          isSelected={isSelected}
          onSelect={id => onSelect(Number(id))}
          animationDelay={itemAnimationDelay}
          variant="filter"
        />
      );
    },
    [selectedId, onSelect, itemAnimationDelay]
  );

  // Skip rendering if no items
  if (items.length === 0) return null;

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(LAYOUT.ANIMATION.DURATION.NORMAL).delay(animationDelay)}
    >
      <View style={styles.headerContainer}>
        <SectionTitle title={title} />
        {selectedId !== null && onClearFilter && (
          <Pressable
            style={[styles.clearButton, { backgroundColor: colors.textOverlay }]}
            onPress={onClearFilter}
          >
            <ThemedText style={[styles.clearButtonText, { color: colors.tint }]} skipDefaultColor>
              Clear
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
      />
    </Animated.View>
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
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  clearButton: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL / 2,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default React.memo(FilterList) as typeof FilterList;
