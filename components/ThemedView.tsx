import React, { useMemo, memo, JSX } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';
import { ScrollView, View, StyleSheet } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import type { ThemedViewProps } from '@/types/ui/layout.types';

/**
 * ThemedView is a flexible container component that automatically applies theme colors
 * and provides options for scrollable content, safe area insets, and more.
 *
 * It serves as the foundation for most screens in the app, ensuring consistent
 * theming and behavior across the application.
 */

function ThemedViewComponent({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  useSafeArea = true,
  includeBottomInset = true,
  safeAreaEdges,
  scrollViewProps,
  ...otherProps
}: ThemedViewProps): JSX.Element {
  const colors = useColors();

  // Apply theme-based styling
  const themedStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: colors.background,
      },
      style,
    ],
    [colors.background, style]
  ) as StyleProp<ViewStyle>;

  // Determine which edges to apply safe area insets to
  const edges = useMemo((): Edge[] | undefined => {
    // If specific edges are provided, use those
    if (safeAreaEdges) {
      return safeAreaEdges;
    }

    // Otherwise, determine based on includeBottomInset
    // When includeBottomInset is true, return undefined to apply all edges
    // When false, exclude the bottom edge
    return includeBottomInset ? undefined : ['top', 'left', 'right'];
  }, [includeBottomInset, safeAreaEdges]);

  // Memoize the scrollable content separately to reduce dependency chain
  const scrollableContent = useMemo(
    () => (
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        bounces={true}
        removeClippedSubviews={true}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical={true}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    ),
    [children, contentContainerStyle, scrollViewProps]
  );

  // Render the component with fewer dependencies
  if (useSafeArea) {
    return (
      <SafeAreaView style={themedStyle} {...otherProps} edges={edges}>
        {scrollable ? scrollableContent : children}
      </SafeAreaView>
    );
  }

  return (
    <View style={themedStyle} {...otherProps}>
      {scrollable ? scrollableContent : children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Memoize the component to prevent unnecessary rerenders
export const ThemedView = memo(ThemedViewComponent);
