import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React, { memo } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import Auth from '@/components/auth';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

const AuthScreen = memo(function AuthScreen(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, LAYOUT.SPACING.LARGE),
              paddingBottom: Math.max(insets.bottom, LAYOUT.SPACING.LARGE),
            },
          ]}
        >
          {/* Header Section - Visual Hierarchy Level 1 */}
          <View style={styles.headerContainer}>
            <ThemedText align="center" type="heading1" colorName="headingText">
              Welcome to OpenArabic
            </ThemedText>
            <ThemedText align="center" type="body" variant="secondary" style={styles.subtitle}>
              Sign in to continue learning Arabic
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
