import type { JSX } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/theme/useColors';
import type { ThemedViewProps } from '@/types/ui/layout.types';

// Static constants — zero per-render allocations
const EDGES_WITHOUT_BOTTOM: Edge[] = ['top', 'left', 'right'];

const SCROLL_VIEW_DEFAULTS = {
  automaticallyAdjustContentInsets: false,
  contentInsetAdjustmentBehavior: 'automatic' as const,
  showsVerticalScrollIndicator: false,
  overScrollMode: 'always' as const,
};

/**
 * `scrollViewProps` for a screen whose content is a form: taps reach the
 * controls while the keyboard is up, and dragging the list dismisses it.
 *
 * Every auth screen wrote this same literal by hand. It is a behaviour preset,
 * not a style, so it lives with the component that consumes it rather than in
 * the layout tokens.
 */
export const KEYBOARD_AWARE_SCROLL_PROPS = {
  keyboardShouldPersistTaps: 'handled',
  showsVerticalScrollIndicator: false,
  keyboardDismissMode: 'interactive',
} as const;

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

  const themedStyle = useMemo(
    () => [styles.container, { backgroundColor: colors.background }, style],
    [colors.background, style],
  );

  // Determine which edges to apply safe area insets to
  const edges = safeAreaEdges ?? (includeBottomInset ? undefined : EDGES_WITHOUT_BOTTOM);

  // Only create ScrollView when needed
  const content = scrollable ? (
    <ScrollView
      {...SCROLL_VIEW_DEFAULTS}
      contentContainerStyle={contentContainerStyle}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    children
  );

  if (useSafeArea) {
    return (
      <SafeAreaView style={themedStyle} {...otherProps} edges={edges}>
        {content}
      </SafeAreaView>
    );
  }

  return (
    <View style={themedStyle} {...otherProps}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

ThemedView.displayName = 'ThemedView';
