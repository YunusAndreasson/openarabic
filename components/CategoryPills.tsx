/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Animated, View, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { Tables } from '../types/database.types';
import * as Haptics from 'expo-haptics';
import { LAYOUT } from '@/constants/layout';
import { LinearGradient } from 'expo-linear-gradient';

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
      // For unselected pills in light mode, we need a more opaque background to hide the shadow line
      const unselectedLightBgOpacity = '90'; // Increased from 60 to 90 to hide the shadow line

      return [
        styles.pill,
        {
          backgroundColor: isSelected
            ? isDarkMode
              ? `${colors.tint}20` // Selected, dark mode (20% opacity - more subtle)
              : `${colors.tint}70` // Selected, light mode (70% opacity - more subtle)
            : isDarkMode
              ? `${colors.elevation2}40` // Unselected, dark mode (40% opacity - more dimmed)
              : `${colors.elevation1}${unselectedLightBgOpacity}`, // Unselected, light mode (increased opacity)
          borderColor: colors.cardBorder, // Use card border color for all pills for consistency
          // Theme-aware shadow for iOS
          ...Platform.select({
            ios: {
              shadowColor: isDarkMode ? colors.shadow : isSelected ? colors.shadow : 'transparent',
              shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
              shadowOpacity: isSelected ? 0.1 : 0,
              shadowRadius: isSelected ? 4 : 0,
            },
            android: {
              elevation: isSelected ? 1 : 0, // Only apply elevation to selected pills
            },
          }),
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
HorizontalCategoryPill.displayName = 'HorizontalCategoryPill';

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
  pill: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.TINY + 2, // Match CategoryPill's padding (TINY + 2)
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    borderWidth: 0.5, // Thinner border for a more elegant look
    // Remove shadow from base style - we'll apply it conditionally in the component
  },
  pillText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY + 1, // Match CategoryPill's font size
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 16, // Match CategoryPill's line height
  },
});
