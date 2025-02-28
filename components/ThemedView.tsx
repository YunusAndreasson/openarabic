import React, { useMemo, useRef, useEffect } from 'react';
import {
  ScrollView,
  type ViewProps,
  type StyleProp,
  ViewStyle,
  Animated,
  Platform,
  Easing,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';

// Extend ViewProps to add optional scrollable behavior and a content container style.
export interface ThemedViewProps extends ViewProps {
  /** Determines whether the view should be scrollable */
  scrollable?: boolean;
  /** Optional style for the ScrollView content container when scrollable */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Optional fade-in duration in milliseconds */
  fadeInDuration?: number;
  /** Optional delay before starting the fade-in animation */
  fadeInDelay?: number;
  /** Whether to use SafeAreaView (default: true) */
  useSafeArea?: boolean;
  /** Whether to include bottom insets in safe area (default: true) */
  includeBottomInset?: boolean;
  /** Specific edges to apply safe area insets to (overrides includeBottomInset) */
  safeAreaEdges?: Edge[];
  /** Whether to apply fade-in animation (default: true) */
  animated?: boolean;
  /** Optional ScrollView props */
  scrollViewProps?: Omit<React.ComponentProps<typeof ScrollView>, 'children'>;
  children?: React.ReactNode;
}

function ThemedViewComponent({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  fadeInDuration = 600, // Longer duration for more subtle effect
  fadeInDelay = 100, // Small delay before animation starts
  useSafeArea = true,
  includeBottomInset = true,
  safeAreaEdges,
  animated = true,
  scrollViewProps,
  ...otherProps
}: ThemedViewProps) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;

  // Apply fade-in effect when component mounts
  useEffect(() => {
    if (!animated) return;

    // Use a sequence with a small delay for a more natural feel
    const animation = Animated.sequence([
      Animated.delay(fadeInDelay),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic bezier curve
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    // Clean up animation when component unmounts
    return () => {
      animation.stop();
    };
  }, [fadeAnim, fadeInDuration, fadeInDelay, animated]);

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
    // Wrap content in Animated.View for fade-in effect
    const animatedContent = (
      <Animated.View style={[styles.animatedContent, animated ? { opacity: fadeAnim } : undefined]}>
        {children}
      </Animated.View>
    );

    // Create the scrollable content
    const scrollableContent = (
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        bounces={true}
        removeClippedSubviews={Platform.OS === 'android'}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical={true}
        {...scrollViewProps}
      >
        {animatedContent}
      </ScrollView>
    );

    // Determine whether to use SafeAreaView or regular View
    if (useSafeArea) {
      return (
        <SafeAreaView style={themedStyle} {...otherProps} edges={edges}>
          {scrollable ? scrollableContent : animatedContent}
        </SafeAreaView>
      );
    }

    return (
      <View style={themedStyle} {...otherProps}>
        {scrollable ? scrollableContent : animatedContent}
      </View>
    );
  }, [
    children,
    contentContainerStyle,
    otherProps,
    scrollable,
    themedStyle,
    fadeAnim,
    useSafeArea,
    edges,
    animated,
    scrollViewProps,
  ]);

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },
});

// Memoize the component to prevent unnecessary rerenders
export const ThemedView = React.memo(ThemedViewComponent);
