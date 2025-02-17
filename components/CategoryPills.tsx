/* eslint-disable react-native/no-unused-styles */
import React, { useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import type { Tables } from '../types/database.types';
import * as Haptics from 'expo-haptics';

interface CategoryPillsProps {
  categories: Tables<'categories'>[];
  selectedCategory: Tables<'categories'> | null;
  onSelectCategory: (category: Tables<'categories'> | null) => void;
  visible: Animated.Value;
}

export function CategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
  visible,
}: CategoryPillsProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 42),
        },
        scrollContent: {
          paddingHorizontal: 16,
          gap: 8,
          paddingVertical: 12,
          paddingBottom: 8,
        },
        pill: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        },
        pillText: {
          fontSize: 15,
          fontWeight: '600',
        },
        activePill: {
          backgroundColor: colors.cardBackground,
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
          opacity: 0.6,
        },
      }),
    [colors, insets]
  );

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

  const handlePress = (category: Tables<'categories'> | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectCategory(category);
  };

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        snapToAlignment="center"
        decelerationRate="fast"
      >
        <TouchableOpacity
          style={[styles.pill, !selectedCategory ? styles.activePill : styles.inactivePill]}
          onPress={() => handlePress(null)}
          activeOpacity={0.7}
        >
          <ThemedText
            style={[
              styles.pillText,
              !selectedCategory ? styles.activePillText : styles.inactivePillText,
            ]}
            skipDefaultColor
          >
            All
          </ThemedText>
        </TouchableOpacity>

        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.pill,
              selectedCategory?.id === category.id ? styles.activePill : styles.inactivePill,
            ]}
            onPress={() => handlePress(category)}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.pillText,
                selectedCategory?.id === category.id
                  ? styles.activePillText
                  : styles.inactivePillText,
              ]}
              skipDefaultColor
            >
              {capitalizeFirstLetter(category.name)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
