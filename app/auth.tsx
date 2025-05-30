import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { JSX, memo } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Auth from '@/components/Auth';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';

const AuthScreen = memo(function AuthScreen(): JSX.Element {
  const colors = useColors();
  const isDark = useIsDarkMode();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, LAYOUT.SPACING.LARGE),
              paddingBottom: Math.max(insets.bottom, LAYOUT.SPACING.LARGE),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Logo Section - Visual Hierarchy Level 1 */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/oa-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="OpenArabic Logo"
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
    width: 110,
    height: 110,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
});
