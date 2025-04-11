import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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

  // Track keyboard height for proper avoidance
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Use a more interesting animation - scale up from slightly smaller with spring physics
  const { animatedStyle, startAnimation } = useTransformAnimation({
    type: 'scale',
    initialValue: 0.9,
    targetValue: 1,
    duration: 700,
    useSpring: true,
    damping: 12,
    stiffness: 100,
  });

  // Start the animation when the component mounts and trigger haptic feedback
  useEffect(() => {
    // Slight delay for the haptic to feel connected to the animation
    setTimeout(() => {
      lightFeedback();
    }, 50);
    startAnimation();
  }, [startAnimation]);

  // Function to handle keyboard appearance
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', event => {
      // Get keyboard height and adjust UI accordingly
      setKeyboardHeight(event.endCoordinates.height);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Reset keyboard height when hidden
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

  // Function to dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Calculate appropriate spacing based on screen state
  const getContentPadding = () => {
    if (keyboardHeight > 0) {
      return { paddingTop: LAYOUT.SPACING.SMALL };
    }
    return { paddingTop: LAYOUT.SPACING.MEDIUM };
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
          animation: 'none', // Disable the default screen transition animation
        }}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        enabled
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, getContentPadding()]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Animated.View style={[styles.contentContainer, animatedStyle]}>
              {/* Pulsating Logo */}
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

      {/* Fixed disclaimer at bottom */}
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
        <ThemedText type="caption" align="center" variant="secondary" style={styles.footerText}>
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
    marginTop: 0, // No margin at top to keep it close to subtitle
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
  footerText: {
    opacity: 0.5, // More dimmed text
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
    paddingTop: LAYOUT.SPACING.MEDIUM,
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
