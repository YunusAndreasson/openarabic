import type { JSX, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Tab-root container that lets iOS UIKit drive the native large-title collapse
 * and scroll-edge fade.
 *
 * iOS `UINavigationController` only tracks the **first descendant scroll view
 * of the screen's primary content view** for large-title collapse and
 * `scrollEdgeAppearance` fade. The routed component must therefore render a
 * thin, non-scrollable wrapper whose only meaningful child is the scrollable
 * itself. Wrapping the scrollable inside `<ThemedView>` (a `SafeAreaView`/`View`
 * stack) breaks the tracker even when `contentInsetAdjustmentBehavior="automatic"`
 * still adjusts the content inset — that's the open-arabic-specific bug this
 * component fixes. See edenmind's `components/screen.tsx` for the reference.
 *
 * Contract: `children` MUST be a scrollable (ScrollView / FlashList / FlatList /
 * DraggableFlatList) with `contentInsetAdjustmentBehavior="automatic"` set. Do
 * NOT wrap the scrollable in another View inside this component — that
 * reintroduces the exact bug.
 */
interface TabScreenProps {
  readonly background: string;
  /** Optional absolutely-positioned overlay (e.g. FAB). Rendered as a sibling of the scrollable. */
  readonly fab?: ReactNode;
  readonly children: ReactNode;
}

export function TabScreen({ background, fab, children }: TabScreenProps): JSX.Element {
  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      {children}
      {fab}
    </View>
  );
}

TabScreen.displayName = 'TabScreen';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
