import type { JSX, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { KEYBOARD_AWARE_SCROLL_PROPS, ThemedView } from '@/components/ThemedView';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';

interface AuthScreenShellProps {
  /** The line under the header explaining what this screen is for. */
  subtitle: string;
  children: ReactNode;
}

/**
 * The frame both email auth screens sit in: a keyboard-aware scroll view, a
 * centred subtitle, and a form column capped at 90% of the screen width.
 *
 * `sign-in.tsx` and `sign-up.tsx` were byte-identical across all 71 lines
 * except three tokens — the form they rendered, the subtitle string, and the
 * component name — including both `StyleSheet.create` blocks. Scoped to
 * `components/auth` rather than promoted to a shared primitive: the padding
 * here is tuned for a headerless auth screen and is not what a tab screen or a
 * sheet wants.
 */
export function AuthScreenShell({ subtitle, children }: AuthScreenShellProps): JSX.Element {
  return (
    <ThemedView
      scrollable
      useSafeArea={false}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={KEYBOARD_AWARE_SCROLL_PROPS}
    >
      <View style={styles.content}>
        <ThemedText align="center" type="body" colorName="secondaryText" style={styles.subtitle}>
          {subtitle}
        </ThemedText>

        <View style={styles.formContainer}>{children}</View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  formContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
    maxWidth: SCREEN_WIDTH * 0.9,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: LAYOUT.SPACING.XXXLARGE,
  },
  subtitle: {
    marginBottom: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
});

AuthScreenShell.displayName = 'AuthScreenShell';
