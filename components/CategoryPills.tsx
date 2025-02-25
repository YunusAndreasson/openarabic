/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { Tables } from '../types/database.types';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';

interface CategoryPillsProps {
  categories: Tables<'categories'>[];
  selectedCategory: Tables<'categories'> | null;
  onSelectCategory: (category: Tables<'categories'> | null) => void;
  visible: Animated.Value;
}

// Create a memoized category pill component for the horizontal list
const HorizontalCategoryPill = React.memo(
  ({
    category,
    isSelected,
    onPress,
  }: {
    category: Tables<'categories'> | null;
    isSelected: boolean;
    onPress: () => void;
  }) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();
    const displayText = category ? category.name.toUpperCase() : 'ALL';

    // Memoize the styles based on selection state and theme
    const pillStyle = useMemo(() => {
      return [
        styles.pill,
        {
          backgroundColor: isSelected
            ? isDarkMode
              ? `${colors.tint}20` // Selected, dark mode (20% opacity - more subtle)
              : `${colors.tint}70` // Selected, light mode (70% opacity - more subtle)
            : isDarkMode
              ? `${colors.elevation2}40` // Unselected, dark mode (40% opacity - more dimmed)
              : `${colors.elevation1}60`, // Unselected, light mode (60% opacity - more dimmed)
          borderColor: colors.cardBorder, // Use card border color for all pills for consistency
        },
      ];
    }, [isSelected, colors, isDarkMode]);

    // Memoize the text style based on selection state and theme
    const textStyle = useMemo(() => {
      return [
        styles.pillText,
        {
          color: isSelected
            ? isDarkMode
              ? colors.white // Selected text in dark mode is white for better contrast
              : colors.white // Selected text in light mode is white
            : isDarkMode
              ? `${colors.text}90` // Unselected text in dark mode (90% opacity)
              : `${colors.text}80`, // Unselected text in light mode (80% opacity)
          fontWeight: isSelected ? '700' : ('600' as '700' | '600'), // Selected text is bolder
        },
      ];
    }, [isSelected, colors, isDarkMode]);

    return (
      <TouchableOpacity style={pillStyle} onPress={onPress} activeOpacity={0.7}>
        <ThemedText style={textStyle} skipDefaultColor>
          {displayText}
        </ThemedText>
      </TouchableOpacity>
    );
  }
);

function CategoryPillsComponent({
  categories,
  selectedCategory,
  onSelectCategory,
  visible,
}: CategoryPillsProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Memoize the animated style
  const containerAnimatedStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: visible.interpolate({
            inputRange: [0, 1],
            outputRange: [-100, 0],
          }),
        },
      ],
      opacity: visible,
      marginBottom: -LAYOUT.SPACING.XLARGE, // Increased negative margin from MEDIUM to XLARGE
    }),
    [visible]
  );

  // Memoize the press handler factory
  const createPressHandler = useCallback(
    (category: Tables<'categories'> | null) => () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectCategory(category);
    },
    [onSelectCategory]
  );

  // Render the component
  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.background }, containerAnimatedStyle]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
      >
        <HorizontalCategoryPill
          category={null}
          isSelected={selectedCategory === null}
          onPress={createPressHandler(null)}
        />

        {categories.map(category => (
          <HorizontalCategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategory?.id === category.id}
            onPress={createPressHandler(category)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// Memoize the entire component
export const CategoryPills = React.memo(CategoryPillsComponent);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    gap: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.CONTENT_SPACING.TOP,
    paddingBottom: 0, // Removed padding completely (was LAYOUT.SPACING.TINY)
  },
  pill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY + 2, // Match CategoryPill's padding (TINY + 2)
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5, // Thinner border for a more elegant look
    ...LAYOUT.SHADOW.SMALL,
    elevation: 1, // Reduced elevation for a more subtle look
  },
  pillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1, // Match CategoryPill's font size
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 16, // Match CategoryPill's line height
  },
});
