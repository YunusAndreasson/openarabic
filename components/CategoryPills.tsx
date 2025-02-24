/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import type { Tables } from '../types/database.types';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';

interface CategoryPillsProps {
  categories: Tables<'categories'>[];
  selectedCategory: Tables<'categories'> | null;
  onSelectCategory: (category: Tables<'categories'> | null) => void;
  visible: Animated.Value;
}

// Create a memoized category pill component
const CategoryPill = React.memo(
  ({
    category,
    isSelected,
    onPress,
    styles,
  }: {
    category: Tables<'categories'> | null;
    isSelected: boolean;
    onPress: () => void;
    styles: any;
  }) => {
    // Memoize the pill style
    const pillStyle = useMemo(
      () => [styles.pill, isSelected ? styles.activePill : styles.inactivePill],
      [styles, isSelected]
    );

    // Memoize the text style
    const textStyle = useMemo(
      () => [styles.pillText, isSelected ? styles.activePillText : styles.inactivePillText],
      [styles, isSelected]
    );

    const displayText = category ? capitalizeFirstLetter(category.name) : 'All';

    return (
      <TouchableOpacity style={pillStyle} onPress={onPress}>
        <ThemedText style={textStyle} skipDefaultColor>
          {displayText}
        </ThemedText>
      </TouchableOpacity>
    );
  }
);

// Helper function
const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

function CategoryPillsComponent({
  categories,
  selectedCategory,
  onSelectCategory,
  visible,
}: CategoryPillsProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Memoize the styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: LAYOUT.Z_INDEX.HEADER,
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
        scrollContent: {
          paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          gap: LAYOUT.SPACING.SMALL,
          paddingTop: LAYOUT.CONTENT_SPACING.TOP,
          paddingBottom: LAYOUT.SPACING.MEDIUM,
        },
        pill: {
          paddingHorizontal: LAYOUT.SPACING.MEDIUM,
          paddingVertical: LAYOUT.SPACING.SMALL,
          borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
          borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        },
        pillText: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
          fontWeight: '600',
        },
        activePill: {
          backgroundColor: colors.background,
          borderColor: colors.cardBorder,
          shadowColor: colors.text,
        },
        inactivePill: {
          backgroundColor: colors.background,
          borderColor: colors.cardBorder,
          shadowColor: colors.text,
        },
        activePillText: {
          color: colors.titleText,
          opacity: 1,
        },
        inactivePillText: {
          color: colors.text,
          opacity: LAYOUT.OPACITY.DIMMED,
        },
      }),
    [colors, insets]
  );

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
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
      >
        <CategoryPill
          category={null}
          isSelected={selectedCategory === null}
          onPress={createPressHandler(null)}
          styles={styles}
        />

        {categories.map(category => (
          <CategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategory?.id === category.id}
            onPress={createPressHandler(category)}
            styles={styles}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

// Memoize the entire component
export const CategoryPills = React.memo(CategoryPillsComponent);
