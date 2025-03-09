import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';
import { LinearGradient } from 'expo-linear-gradient';
import Pill from '../Pill';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { CategoryPillsContainerProps } from '../../types/ui.types';
import type { Tables } from '../../types/database.types';
import { capitalizeFirstLetter } from '../../utils/stringUtils';

function CategoryPillsContainerComponent({
  categories,
  selectedCategory,
  onSelectCategory,
  visible,
}: CategoryPillsContainerProps): React.JSX.Element {
  const colors = useColors();

  // Memoize the animated style using Reanimated
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(visible.value, [0, 1], [-100, 0]),
        },
      ],
      opacity: visible.value,
      marginBottom: -LAYOUT.SPACING.XLARGE,
    };
  });

  // Memoize the press handler factory
  const createPressHandler = useCallback(
    (category: Tables<'categories'> | null) => () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectCategory(category);
    },
    [onSelectCategory]
  );

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.background }, containerAnimatedStyle]}
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
            isSelected={selectedCategory === null}
            onSelect={() => createPressHandler(null)()}
            variant="horizontal-category"
          />

          {categories.map(category => (
            <Pill
              key={category.id}
              id={category.id}
              label={capitalizeFirstLetter(category.name.toLowerCase())}
              isSelected={selectedCategory?.id === category.id}
              onSelect={() => createPressHandler(category)()}
              variant="horizontal-category"
            />
          ))}
        </ScrollView>

        {/* Right fade gradient */}
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

// Styles for the container component
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
    paddingBottom: 0,
  },
  rightFadeGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '40%',
    zIndex: 1,
  },
});

// Memoize the entire component
export const CategoryPillsContainer = React.memo(CategoryPillsContainerComponent);
CategoryPillsContainer.displayName = 'CategoryPillsContainer';
