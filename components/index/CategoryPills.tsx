/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, useCallback, memo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { CategoryPillsProps } from '@/types/ui/layout.types';

import { capitalizeFirstLetter } from '../../utils/stringUtils';
import Pill from '../Pill';

function CategoryPillsComponent({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryPillsProps) {
  const colors = useColors();

  // Memoize the animated style - remove the transform and opacity animations
  // since we're handling those in the parent component now
  const containerAnimatedStyle = useMemo(
    () => ({
      marginBottom: -LAYOUT.SPACING.XLARGE, // Increased negative margin from MEDIUM to XLARGE
    }),
    []
  );

  // Memoize the press handler factory
  const createPressHandler = useCallback(
    (categoryId: number | null) => () => {
      onSelectCategory(categoryId);
    },
    [onSelectCategory]
  );

  // Render the component
  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.transparent }, containerAnimatedStyle]}
    >
      <View style={styles.scrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={true}
        >
          <Pill
            id="all"
            label="All"
            isSelected={selectedCategoryId === null}
            onSelect={() => createPressHandler(null)()}
            variant="horizontal-category"
          />

          {categories.map(category => (
            <Pill
              key={category.id}
              id={category.id}
              label={capitalizeFirstLetter(category.name.toLowerCase())}
              isSelected={selectedCategoryId === category.id}
              onSelect={() => createPressHandler(category.id)()}
              variant="horizontal-category"
            />
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

// Memoize the entire component
export const CategoryPills = memo(CategoryPillsComponent);

const styles = StyleSheet.create({
  container: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  leftFadeGradient: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: 1,
  },
  rightFadeGradient: {
    bottom: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: `${LAYOUT.WIDTH_RATIOS.TWO_FIFTHS * 100}%`, // Better than hardcoded 40%
    zIndex: 1,
  },
  scrollContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  scrollContent: {
    gap: LAYOUT.SPACING.SMALL,
    paddingBottom: 0,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.CONTENT_SPACING.TOP, // Removed padding completely (was LAYOUT.SPACING.TINY)
  },
});
