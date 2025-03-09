import React, { useMemo } from 'react';
import { StyleSheet, View, Pressable, FlatList, ListRenderItem, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { LAYOUT } from '../constants/layout';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolateColor,
  Layout,
} from 'react-native-reanimated';
import { createBasePillStyles } from './pills/BasePill';
import { Category } from '../types/articles.types';

// Define a type for our category item (including the "All" option)
export type CategoryItem = Category;

export interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

// Create the animated components
const AnimatedFlatList =
  Animated.createAnimatedComponent<React.ComponentProps<typeof FlatList<CategoryItem>>>(FlatList);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Extract CategoryPill as a separate component to use hooks
const CategoryPill = React.memo(function CategoryPill({
  item,
  index,
  isSelected,
  onPress,
  isDarkMode,
  colors,
}: {
  item: CategoryItem;
  index: number;
  isSelected: boolean;
  onPress: () => void;
  isDarkMode: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  // Animation values
  const scale = useSharedValue(1);

  // Animate pill on selection - optimized animation values
  const animatedStyles = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      scale.value,
      [0.95, 1, 1.05],
      [
        isSelected
          ? isDarkMode
            ? colors.cardBackground
            : colors.tint
          : isDarkMode
            ? `${colors.elevation2}40`
            : `${colors.elevation1}90`,
        isSelected
          ? isDarkMode
            ? `${colors.cardBackground}90`
            : `${colors.tint}70`
          : isDarkMode
            ? `${colors.elevation2}40`
            : `${colors.elevation1}90`,
        isSelected
          ? isDarkMode
            ? colors.cardBackground
            : colors.tint
          : isDarkMode
            ? `${colors.elevation2}40`
            : `${colors.elevation1}90`,
      ]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      // Add shadow for better visibility
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.3 : 0.2,
      shadowRadius: 2,
      elevation: 3,
    };
  });

  return (
    <AnimatedPressable
      style={[styles.categoryPill, isSelected ? styles.selectedPill : null, animatedStyles]}
      onPress={onPress}
      layout={Layout.springify().damping(15)}
    >
      <ThemedText
        style={[
          styles.pillText,
          {
            color: isSelected
              ? isDarkMode
                ? colors.white
                : colors.white
              : isDarkMode
                ? colors.text
                : colors.text,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.id === -1 ? 'ALL' : item.name.toUpperCase()}
      </ThemedText>
    </AnimatedPressable>
  );
});

CategoryPill.displayName = 'CategoryPill';

// Main component
function CategorySelectorComponent({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySelectorProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Create a "ALL" category and combine with the provided categories
  const allCategories = useMemo(() => {
    // Create "All" category with id -1 to ensure it's unique
    const allCategory = { id: -1, name: 'All', created_at: '', updated_at: '' };
    return [allCategory, ...categories];
  }, [categories]);

  // Memoize the render function to avoid recreating on each render
  const renderCategoryItem = useMemo(() => {
    const renderer: ListRenderItem<CategoryItem> = ({ item, index }) => {
      const isSelected = selectedCategoryId === (item.id === -1 ? null : item.id);

      return (
        <CategoryPill
          item={item}
          index={index}
          isSelected={isSelected}
          onPress={() => onSelectCategory(item.id === -1 ? null : item.id)}
          isDarkMode={isDarkMode}
          colors={colors}
        />
      );
    };
    return renderer;
  }, [selectedCategoryId, onSelectCategory, isDarkMode, colors]);

  // optimize list performance
  const keyExtractor = (item: CategoryItem) => item.id.toString();

  return (
    <View style={styles.containerOuter}>
      {/* Category list with optimized list rendering */}
      <FlatList
        data={allCategories}
        renderItem={renderCategoryItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={7}
        decelerationRate="fast"
        snapToAlignment="center"
        removeClippedSubviews={true}
      />
    </View>
  );
}

// Memoize the component to prevent unnecessary rerenders
export const CategorySelector = React.memo(CategorySelectorComponent);

const styles = StyleSheet.create({
  containerOuter: {
    position: 'relative',
    height: 38, // Fixed height for the container
    zIndex: 10, // Ensure it's above the FlatList
  },
  categoryPill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL - 2,
    borderRadius: 34 / 2, // Half of height for pill shape
    marginRight: LAYOUT.SPACING.SMALL,
    height: 34,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
    width: 'auto',
  },
  selectedPill: {
    // Additional styles for selected state
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    alignItems: 'center',
    paddingBottom: 4,
  },
});
