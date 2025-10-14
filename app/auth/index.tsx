import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Auth from '@/components/auth';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

const AuthScreen = memo(function AuthScreen(): JSX.Element {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  // Animated style that responds to keyboard height
  const animatedContainerStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value > 0 ? keyboard.height.value : Math.max(insets.bottom, LAYOUT.SPACING.LARGE),
  }));

  return (
    <ThemedView style={styles.container} useSafeArea={true} safeAreaEdges={['top']}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      <Animated.View style={[styles.keyboardAvoidingView, animatedContainerStyle]}>
        <ThemedView
          scrollable
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, LAYOUT.SPACING.LARGE),
            },
          ]}
        >
          {/* Header Section - Visual Hierarchy Level 1 */}
          <View style={styles.headerContainer}>
            <ThemedText align="center" type="heading1" colorName="headingText">
              {STRINGS.WELCOME_TITLE}
            </ThemedText>
            <ThemedText align="center" type="body" variant="secondary" style={styles.subtitle}>
              {STRINGS.WELCOME_SUBTITLE}
            </ThemedText>
          </View>

          {/* Auth Form - Visual Hierarchy Level 2 */}
          <View
            style={[
              styles.authContainer,
              {
                paddingHorizontal: Math.max(
                  insets.left + LAYOUT.SPACING.LARGE,
                  LAYOUT.SPACING.LARGE
                ),
              },
            ]}
          >
            <Auth />
          </View>
        </ThemedView>
      </Animated.View>
    </ThemedView>
  );
});

export default AuthScreen;

const styles = StyleSheet.create({
  authContainer: {
    width: '100%',
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
