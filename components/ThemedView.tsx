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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  ...otherProps
}: ThemedViewProps) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Apply fade-in effect when component mounts
  useEffect(() => {
    // Use a sequence with a small delay for a more natural feel
    Animated.sequence([
      Animated.delay(fadeInDelay),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Smooth cubic bezier curve
        useNativeDriver: true,
      }),
    ]).start();

    // Clean up animation when component unmounts
    return () => {
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, fadeInDuration, fadeInDelay]);

  // Apply theme-based styling
  const themedStyle = useMemo(
    () => [
      {
        backgroundColor: colors.background,
        flex: 1,
      },
      style,
    ],
    [colors.background, style]
  );

  // Use useMemo to prevent unnecessary rerenders when props don't change
  const content = useMemo(() => {
    // Wrap content in Animated.View for fade-in effect
    const animatedContent = (
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
        }}
      >
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
        // Optimize scrolling
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        alwaysBounceVertical={true}
      >
        {animatedContent}
      </ScrollView>
    );

    // Determine whether to use SafeAreaView or regular View
    if (useSafeArea) {
      return (
        <SafeAreaView
          style={themedStyle}
          {...otherProps}
          edges={includeBottomInset ? undefined : ['top', 'left', 'right']}
        >
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
    includeBottomInset,
  ]);

  return content;
}

// Memoize the component to prevent unnecessary rerenders
export const ThemedView = React.memo(ThemedViewComponent);
