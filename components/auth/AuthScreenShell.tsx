import type { JSX, ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { KEYBOARD_AWARE_SCROLL_PROPS, ThemedView } from '@/components/primitives/ThemedView';
import { AUTH_CONTENT_MAX_WIDTH_RATIO, LAYOUT } from '@/constants/layout';

interface AuthScreenShellProps {
  /** The line under the header explaining what this screen is for. */
  subtitle: string;
  children: ReactNode;
}

/**
 * Keyboard-aware scroll view and centered form column for the email step.
 */
export function AuthScreenShell({ subtitle, children }: AuthScreenShellProps): JSX.Element {
  const { width } = useWindowDimensions();

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

        <View style={[styles.formContainer, { maxWidth: width * AUTH_CONTENT_MAX_WIDTH_RATIO }]}>
          {children}
        </View>
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
