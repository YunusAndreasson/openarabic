import React, { useMemo } from 'react';
import { StyleSheet, View, Pressable, FlatList, ListRenderItem, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { useIsDarkMode } from '../hooks/useThemeDetection';
import { LAYOUT } from '../constants/layout';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  interpolateColor,
  SlideInRight,
  useAnimatedScrollHandler,
  Layout,
  ZoomIn,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { createBasePillStyles } from './pills/BasePill';
import type { Tables } from '../types/database.types';

// Define a type for our category item (including the "All" option)
export type CategoryItem = Tables<'categories'>;

export interface CategorySelectorProps {
  categories: CategoryItem[];
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
  const opacity = useSharedValue(1);

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
      opacity: opacity.value,
      backgroundColor,
      // Add shadow for better visibility
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.3 : 0.2,
      shadowRadius: 2,
      elevation: 3,
    };
  });

  // Handle press with optimized animation
  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1.05, { duration: 100, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: 150, easing: Easing.inOut(Easing.quad) })
    );
    onPress();
  };

  // Entry animation with staggered timing based on index
  const entryAnimation = useMemo(() => {
    return ZoomIn.duration(400)
      .easing(Easing.out(Easing.quad))
      .delay(100 + index * 50);
  }, [index]);

  return (
    <AnimatedPressable
      style={[styles.categoryPill, isSelected ? styles.selectedPill : null, animatedStyles]}
      onPress={handlePress}
      entering={entryAnimation}
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

  // Optimize scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      // We could implement scroll effects here if needed
    },
  });

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
  const keyExtractor = useSharedValue((item: CategoryItem) => item.id.toString());

  return (
    <Animated.View
      style={styles.containerOuter}
      entering={FadeIn.duration(500).easing(Easing.out(Easing.cubic))}
    >
      {/* Category list with optimized list rendering */}
      <AnimatedFlatList
        data={allCategories}
        renderItem={renderCategoryItem}
        keyExtractor={keyExtractor.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={15}
        windowSize={7}
        decelerationRate="fast"
        snapToAlignment="center"
        removeClippedSubviews={true}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        entering={SlideInRight.springify().damping(15).delay(200)}
        layout={Layout.springify().damping(15)}
      />
    </Animated.View>
  );
}

// Memoize the component to prevent unnecessary rerenders
export const CategorySelector = React.memo(CategorySelectorComponent);

const styles = StyleSheet.create({
  containerOuter: {
    position: 'relative',
    height: 38, // Fixed height for the container
    zIndex: 0, // Set to 0 to ensure it's below the refresh indicator
  },
  categoryPill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL - 2,
    borderRadius: 18,
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
