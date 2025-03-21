import React, { useCallback, useEffect, useMemo } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import SectionTitle from './SectionTitle';
import { ThemedText } from './ThemedText';
import Pill from './Pill';
import { capitalizeFirstLetter } from '../utils/stringUtils';
import { useFadeInAnimation } from '../hooks/animations';
import { FilterItem, FilterListProps } from '@/types/ui.types';

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
  const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

  // Memoize styles that use colors to prevent new object creation on each render
  const clearButtonStyle = useMemo(
    () => ({ backgroundColor: colors.textOverlay }),
    [colors.textOverlay]
  );

  // Start animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startAnimation(animationDelay);
    }, 0);

    return () => clearTimeout(timer);
  }, [startAnimation, animationDelay]);

  // Determine if this is a category filter based on the title
  const isCategory = title.toLowerCase().includes('category');

  // Render each filter item with staggered animation
  const renderItem = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      const isSelected = selectedId === item.id;
      const delay = itemAnimationDelay + index * 50; // Stagger the animations
      // Format the label based on whether this is a category filter
      const formattedLabel = isCategory
        ? capitalizeFirstLetter(item.name.toLowerCase())
        : item.name;

      return (
        <Pill
          key={`filter-pill-${item.id}`}
          id={item.id}
          label={formattedLabel}
          isSelected={isSelected}
          onSelect={id => onSelect(Number(id))}
          animationDelay={delay}
          variant="filter"
        />
      );
    },
    [selectedId, onSelect, itemAnimationDelay, isCategory]
  );

  // Skip rendering if no items
  if (items.length === 0) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.headerContainer}>
        <SectionTitle title={title} />
        {selectedId !== null && onClearFilter && (
          <Pressable
            style={[styles.clearButton, clearButtonStyle]}
            onPress={onClearFilter}
            accessibilityLabel={`Clear ${title.toLowerCase()} filter`}
            accessibilityRole="button"
          >
            <ThemedText type="bodyBold" colorName="tint" skipDefaultColor>
              Clear Filter
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
        accessibilityLabel={`List of ${title.toLowerCase()} filters`}
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
});

export default React.memo(FilterList) as typeof FilterList;
