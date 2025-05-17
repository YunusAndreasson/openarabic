import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { JSX, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Auth from '@/components/Auth';
import PulsatingLogo from '@/components/PulsatingLogo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { lightFeedback } from '@/utils/haptics';

export default function AuthScreen(): JSX.Element {
  const colors = useColors();
  const isDark = useIsDarkMode();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { animatedStyle, startAnimation } = useTransformAnimation({
    type: 'scale',
    initialValue: 0.9,
    targetValue: 1,
    duration: 700,
    useSpring: true,
    damping: 12,
    stiffness: 100,
  });

  useEffect(() => {
    setTimeout(() => {
      lightFeedback();
    }, 50);
    startAnimation();
  }, [startAnimation]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleOpenWebsite = () => {
    Linking.openURL('https://openarabic.io');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const contentPadding = {
    paddingTop: keyboardHeight > 0 ? LAYOUT.SPACING.SMALL : LAYOUT.SPACING.MEDIUM,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        enabled
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, contentPadding]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Animated.View style={[styles.contentContainer, animatedStyle]}>
              <View style={styles.logoContainer}>
                <PulsatingLogo size={120} />
                <ThemedText
                  type="body"
                  align="center"
                  variant="secondary"
                  style={styles.subtitleText}
                >
                  Learn Arabic by Reading and Listening to Classical Islamic Texts by Renowned
                  Scholars.
                </ThemedText>
              </View>

              <ThemedView style={styles.authContainer} contentContainerStyle={styles.noPadding}>
                <Auth disableLoading={true} />
              </ThemedView>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <TouchableOpacity
        style={[
          styles.footerContainer,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : LAYOUT.SPACING.SMALL,
            backgroundColor: colors.transparent,
          },
        ]}
        onPress={handleOpenWebsite}
        activeOpacity={0.7}
      >
        <ThemedText type="caption" align="center" variant="secondary">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </ThemedText>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: LAYOUT.SPACING.SMALL,
    paddingBottom: 0,
    width: '100%',
  },
  footerContainer: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM * 1.5,
    paddingTop: LAYOUT.SPACING.SMALL,
    position: 'absolute',
    right: 0,
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  noPadding: {
    padding: 0,
  },
  scrollContent: {
    flexGrow: 0,
    justifyContent: 'flex-start',
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  subtitleText: {
    lineHeight: 22,
    marginBottom: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
    maxWidth: 320,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
});
