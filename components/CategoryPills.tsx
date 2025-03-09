/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Tables } from '../types/database.types';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';
import { LinearGradient } from 'expo-linear-gradient';
import Pill from './Pill';
import Animated, { SharedValue } from 'react-native-reanimated';

interface CategoryPillsProps {
  categories: Tables<'categories'>[];
  selectedCategory: Tables<'categories'> | null;
  onSelectCategory: (category: Tables<'categories'> | null) => void;
  visible: SharedValue<number>;
}

function CategoryPillsComponent({
  categories,
  selectedCategory,
  onSelectCategory,
  visible,
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
    (category: Tables<'categories'> | null) => () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectCategory(category);
    },
    [onSelectCategory]
  );

  // Render the component
  return (
    <Animated.View
      style={[styles.container, { backgroundColor: 'transparent' }, containerAnimatedStyle]}
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
            label="ALL"
            isSelected={selectedCategory === null}
            onSelect={() => createPressHandler(null)()}
            variant="horizontal-category"
          />

          {categories.map(category => (
            <Pill
              key={category.id}
              id={category.id}
              label={category.name}
              isSelected={selectedCategory?.id === category.id}
              onSelect={() => createPressHandler(category)()}
              variant="horizontal-category"
            />
          ))}
        </ScrollView>

        {/* Right fade gradient (more pronounced, starts earlier) */}
        <LinearGradient
          colors={['transparent', colors.background, colors.background]}
          start={{ x: 0.3, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          locations={[0, 0.7, 1]}
          style={styles.rightFadeGradient}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  );
}

// Memoize the entire component
export const CategoryPills = React.memo(CategoryPillsComponent);
CategoryPills.displayName = 'CategoryPills';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  scrollContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    gap: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.CONTENT_SPACING.TOP,
    paddingBottom: 0, // Removed padding completely (was LAYOUT.SPACING.TINY)
  },
  leftFadeGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: 1,
  },
  rightFadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%', // Use percentage instead of fixed width to better adapt to different screen sizes
    zIndex: 1,
  },
});
