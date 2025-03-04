import React, { useMemo } from 'react';
import {
  ScrollView,
  type ViewProps,
  type StyleProp,
  ViewStyle,
  Platform,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

// Extend ViewProps to add optional scrollable behavior and a content container style.
export interface ThemedViewProps extends ViewProps {
  /** Determines whether the view should be scrollable */
  scrollable?: boolean;
  /** Optional style for the ScrollView content container when scrollable */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether to use SafeAreaView (default: true) */
  useSafeArea?: boolean;
  /** Whether to include bottom insets in safe area (default: true) */
  includeBottomInset?: boolean;
  /** Specific edges to apply safe area insets to (overrides includeBottomInset) */
  safeAreaEdges?: Edge[];
  /** Optional ScrollView props */
  scrollViewProps?: Omit<React.ComponentProps<typeof ScrollView>, 'children'>;
  children?: React.ReactNode;
}

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
}: ThemedViewProps) {
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
  );

  // Determine which edges to apply safe area insets to
  const edges = useMemo((): Edge[] | undefined => {
    // If specific edges are provided, use those
    if (safeAreaEdges) {
      return safeAreaEdges;
    }

    // Otherwise, determine based on includeBottomInset
    return includeBottomInset ? undefined : (['top', 'left', 'right'] as Edge[]);
  }, [includeBottomInset, safeAreaEdges]);

  // Use useMemo to prevent unnecessary rerenders when props don't change
  const content = useMemo(() => {
    // Create the scrollable content
    const scrollableContent = (
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
    );

    // Determine whether to use SafeAreaView or regular View
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
  }, [
    children,
    contentContainerStyle,
    otherProps,
    scrollable,
    themedStyle,
    useSafeArea,
    edges,
    scrollViewProps,
  ]);

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Memoize the component to prevent unnecessary rerenders
export const ThemedView = React.memo(ThemedViewComponent);
