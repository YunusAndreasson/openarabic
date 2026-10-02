import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KEYBOARD_AWARE_SCROLL_PROPS, ThemedView } from '@/components/primitives/ThemedView';
import { LAYOUT } from '@/constants/layout';

interface ScreenScaffoldProps {
  children: ReactNode;
  /** Wrap the content in a scroll view (default: true). */
  scrollable?: boolean;
  /**
   * Apply the standard screen horizontal padding (default: true). Set false
   * when the child owns its own gutters — a form or a list that bleeds its
   * separators to the screen edge.
   */
  padded?: boolean;
  /** Extra styles for the scroll content container. */
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * The standard scaffold for a pushed or modal screen that sits under a
 * navigation header: horizontal safe-area only, scrolling content, and bottom
 * padding that clears the home indicator.
 *
 * Every account and auth text screen wrote this by hand as a nested pair of
 * `ThemedView`s — outer with `safeAreaEdges={['left','right']}`, inner
 * `scrollable` with `paddingBottom: XLARGE + insets.bottom` — eight times, and
 * the copies had already drifted apart.
 *
 * `ThemedView` remains the low-level primitive; this is a composition over it,
 * not a replacement. Screens with their own scroll container (a `FlashList`, the
 * article reader) should keep using `ThemedView` directly, and form sheets must
 * use `SheetScreen` instead — see the constraints documented there.
 */
export const ScreenScaffold: FC<ScreenScaffoldProps> = ({
  children,
  scrollable = true,
  padded = true,
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();

  const scrollContentStyle = useMemo(
    () => [
      styles.lead,
      padded && styles.padded,
      // The header owns the top inset; only the bottom needs clearing by hand.
      { paddingBottom: LAYOUT.SPACING.XLARGE + insets.bottom },
      contentContainerStyle,
    ],
    [padded, insets.bottom, contentContainerStyle],
  );

  if (!scrollable) {
    return (
      <ThemedView
        includeBottomInset={false}
        safeAreaEdges={EDGES}
        style={[styles.container, styles.lead, padded && styles.padded]}
      >
        {children}
      </ThemedView>
    );
  }

  return (
    <ThemedView includeBottomInset={false} safeAreaEdges={EDGES} style={styles.container}>
      {/* Keyboard-aware: the ScrollView default, keyboardShouldPersistTaps
          "never", spends the first tap while the keyboard is up on dismissing
          it — and a parent ScrollView's setting wins over a nested one's. So
          on Feedback and Delete account the first tap on the action button
          did nothing but close the keyboard. */}
      <ThemedView
        scrollable
        contentContainerStyle={scrollContentStyle}
        includeBottomInset={false}
        style={styles.container}
        useSafeArea={false}
        scrollViewProps={KEYBOARD_AWARE_SCROLL_PROPS}
      >
        {children}
      </ThemedView>
    </ThemedView>
  );
};

// Module-level so the array identity is stable across renders.
const EDGES: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  /** The 12px lead-in every screen sits below its header by. */
  lead: {
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  padded: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
});

ScreenScaffold.displayName = 'ScreenScaffold';
