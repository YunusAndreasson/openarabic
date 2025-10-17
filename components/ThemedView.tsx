import type { JSX } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/theme/useColors';
import type { ThemedViewProps } from '@/types/ui/layout.types';

/**
 * ThemedView is a flexible container component that automatically applies theme colors
 * and provides options for scrollable content, safe area insets, and more.
 *
 * It serves as the foundation for most screens in the app, ensuring consistent
 * theming and behavior across the application.
 */

export function ThemedView({
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
  const themedStyle = [
    styles.container,
    {
      backgroundColor: colors.background,
    },
    style,
  ] as StyleProp<ViewStyle>;

  // Determine which edges to apply safe area insets to
  const edges: Edge[] | undefined = safeAreaEdges
    ? safeAreaEdges
    : includeBottomInset
      ? undefined
      : ['top', 'left', 'right'];

  const scrollableContent = (
    <ScrollView
      // iOS best practice: Allow natural bounce behavior for tactile feedback
      // Users expect to be able to "pull" the screen even when no refresh is needed
      alwaysBounceVertical={true}
      automaticallyAdjustContentInsets={false}
      bounces={true}
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="never"
      removeClippedSubviews={true}
      showsVerticalScrollIndicator={false}
      // Allow natural overscroll behavior on Android for consistency
      overScrollMode="always"
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  );

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

ThemedView.displayName = 'ThemedView';
