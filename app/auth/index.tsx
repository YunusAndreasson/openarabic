import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React, { memo } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
          {/* Logo Section - Visual Hierarchy Level 1 */}
          <View style={styles.logoContainer}>
            <Image
              accessibilityLabel="OpenArabic Logo"
              resizeMode="contain"
              source={require('@/assets/images/oaLogo.png')}
              style={styles.logo}
            />
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
                paddingRight: Math.max(insets.right + LAYOUT.SPACING.LARGE, LAYOUT.SPACING.LARGE),
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
  keyboardAvoidingView: {
    flex: 1,
  },
  logo: {
    height: 110,
    width: 110,
  },
  logoContainer: {
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: LAYOUT.SPACING.XLARGE,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
});
