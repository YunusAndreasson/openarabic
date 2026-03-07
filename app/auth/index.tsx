import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { Auth } from '@/components/auth';
import { LAYOUT } from '@/constants/layout';

const AuthScreen = memo(function AuthScreen(): JSX.Element {
  return (
    <ThemedView
      scrollable
      useSafeArea={false}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      scrollViewProps={{
        keyboardShouldPersistTaps: 'handled',
        showsVerticalScrollIndicator: false,
        keyboardDismissMode: 'interactive',
      }}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Auth />
    </ThemedView>
  );
});

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: LAYOUT.SPACING.XXXLARGE * 2, // Stable top anchor — prevents layout shift when toggling email options
  },
});
