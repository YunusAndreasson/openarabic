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

  // Animate pill on selection
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      backgroundColor: interpolateColor(
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
      ),
      // Add shadow for better visibility
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.3 : 0.2,
      shadowRadius: 2,
      elevation: 3,
    };
  });

  // Use the shared base pill styles
  const pillStyles = useMemo(
    () =>
      createBasePillStyles({
        isSelected,
        isDarkMode,
        colors,
      }),
    [isSelected, isDarkMode, colors]
  );

  // Custom styles for more compact pills
  const compactPillStyles = useMemo(
    () => ({
      container: {
        ...pillStyles.container,
        paddingVertical: 6, // Smaller vertical padding
        paddingHorizontal: LAYOUT.SPACING.MEDIUM - 2,
        backgroundColor: undefined, // We'll handle this in the animated style
      },
      text: {
        ...pillStyles.text,
        fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY, // Slightly smaller font
      },
    }),
    [pillStyles]
  );

  // Handle press with animation
  const handlePress = () => {
    // Only animate if not already selected
    if (!isSelected) {
      // Slight bounce effect
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.05, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );

      // Fade effect
      opacity.value = withSequence(
        withTiming(0.8, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );
    }

    onPress();
  };

  return (
    <AnimatedPressable
      style={[styles.categoryItem, compactPillStyles.container, animatedStyles]}
      onPress={handlePress}
      entering={FadeIn.delay(50 * index).duration(300)}
      layout={Layout.springify()}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`Category ${item.name}`}
    >
      <ThemedText
        style={[styles.categoryText, compactPillStyles.text]}
        skipDefaultColor
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {item.name.toUpperCase()}
      </ThemedText>
    </AnimatedPressable>
  );
});

// Main component is memoized for performance
function CategorySelectorComponent({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategorySelectorProps) {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Animated scroll state
  const scrollX = useSharedValue(0);

  // Create scroll handler with Reanimated 2
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Create a special "All" category for showing all articles
  const allCategories = useMemo(() => {
    return [{ id: -1, name: 'All' } as CategoryItem, ...categories];
  }, [categories]);

  // Render a single category pill - memoized to prevent unnecessary re-renders
  const renderCategoryItem = useMemo(() => {
    const renderer: ListRenderItem<CategoryItem> = ({ item, index }) => {
      const isSelected =
        (item.id === -1 && selectedCategoryId === null) || item.id === selectedCategoryId;

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
    <Animated.View style={styles.containerOuter} entering={FadeIn.duration(500)}>
      {/* Background blur effect removed */}
      {/* {blurBackground} */}

      {/* Category list */}
      <AnimatedFlatList
        data={allCategories}
        renderItem={renderCategoryItem}
        keyExtractor={keyExtractor.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        decelerationRate="fast"
        snapToAlignment="center"
        removeClippedSubviews={Platform.OS === 'android'}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        entering={SlideInRight.springify().delay(200)}
        layout={Layout.springify()}
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
    zIndex: 10, // Higher z-index to ensure it stays on top
    marginTop: 0, // Ensure no top margin
    marginBottom: LAYOUT.SPACING.TINY, // Add space below the selector
    // Make background fully transparent
    backgroundColor: 'transparent',
  },
  // Keep the blurContainer style for reference but it won't be used
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0, // Remove top border radius so it extends seamlessly to the header
    borderBottomLeftRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderBottomRightRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    marginHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL / 2, // Increased vertical padding
  },
  categoryItem: {
    marginRight: LAYOUT.SPACING.SMALL,
    height: 30, // Fixed height for the pill
    justifyContent: 'center', // Center the text vertically
  },
  categoryText: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3, // Slightly tighter letter spacing
  },
});
