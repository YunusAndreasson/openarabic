import { StyleSheet, Alert, Linking, View, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useState, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { ThemedButton } from '../../components/ThemedButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { CustomSlider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import { supabase } from '../../services/supabase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFontScale, setShowEnglish } from '../../store/settingsSlice';
import Auth from '../../components/Auth';
import { useColors } from '../../hooks/useColors';
import { LAYOUT } from '../../constants/layout';
import { LoadingScreen } from '../../components/Loader';
import { useLoadingState, useScreenAnimation } from '@/hooks';
import PageHeader from '@/components/PageHeader';

export default function AccountScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);

  // Use the new loading state hook
  const {
    isLoading: isLoadingState,
    startLoading,
    stopLoading,
    setDataLoaded,
  } = useLoadingState(500, true);

  // Use the new screen animation hook
  const { fadeInStyle } = useScreenAnimation(
    true, // Always ready to display
    isLoadingState,
    300, // Animation duration
    0, // Layout delay
    0 // Animation delay
  );

  const loadSession = useCallback(async () => {
    // Skip if data is already loaded
    if (session) {
      return;
    }

    startLoading();
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      stopLoading();
    }
  }, [session, startLoading, stopLoading, setDataLoaded]);

  // Use focus effect to only load session when tab is focused and data isn't loaded yet
  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [loadSession])
  );

  // Custom button styles to ensure left alignment
  const buttonStyles = useMemo(
    () => ({
      innerContainer: {
        justifyContent: 'flex-start' as const,
        alignItems: 'flex-start' as const,
      },
      contentContainer: {
        justifyContent: 'flex-start' as const,
        alignItems: 'flex-start' as const,
      },
    }),
    []
  );

  // Memoize text preview styles to avoid recalculation on each render
  const previewTextStyles = useMemo(() => {
    const arabicFontSize = LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * settings.fontScale;
    const arabicLineHeight = Math.round(
      LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL * settings.fontScale
    );

    const englishFontSize = LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * settings.fontScale;
    const englishLineHeight = Math.round(
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.NORMAL * settings.fontScale
    );

    return {
      arabic: {
        fontSize: arabicFontSize,
        lineHeight: arabicLineHeight,
        color: colors.arabicText,
        fontFamily: 'NotoNaskhArabic',
      },
      english: {
        fontSize: englishFontSize,
        lineHeight: englishLineHeight,
        color: colors.text,
        fontFamily: 'Philosopher-Regular',
      },
      hiddenEnglish: {
        fontSize: englishFontSize,
        lineHeight: englishLineHeight,
        opacity: 0,
      },
    };
  }, [settings.fontScale, colors.arabicText, colors.text]);

  async function signOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            startLoading();
            try {
              const { error } = await supabase.auth.signOut();
              if (error) Alert.alert('Error', error.message);
            } finally {
              stopLoading();
            }
          },
        },
      ],
      { cancelable: true }
    );
  }

  const handleSupport = () => {
    Linking.openURL('mailto:yunus@edenmind.com');
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url);
  };

  // Handle font scale change with haptic feedback
  const handleFontScaleChange = useCallback(
    (value: number) => {
      // Get the previous scale value
      const previousScale = settings.fontScale;

      // Check if the value has actually changed to a different step
      if (Math.abs(value - previousScale) >= 0.1) {
        // Trigger haptic feedback for every increment
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      dispatch(setFontScale(value));
    },
    [settings.fontScale, dispatch]
  );

  // Show loading screen
  if (isLoadingState) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
        <ThemedView style={styles.container}>
          <PageHeader title="Account" />
          <View style={styles.authContainer}>
            <ThemedText type="title" style={styles.welcomeTitle}>
              Welcome
            </ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to access your account</ThemedText>
            <Auth />
          </View>
        </ThemedView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ flex: 1 }, fadeInStyle]}>
      <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
        {/* Fixed header */}
        <PageHeader title="Account" />

        {/* Scrollable content */}
        <ThemedView
          scrollable={true}
          useSafeArea={false}
          includeBottomInset={false}
          contentContainerStyle={{
            paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
            paddingTop: LAYOUT.SPACING.MEDIUM,
            paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
          }}
        >
          <View style={styles.content}>
            {/* Preferences Section */}
            <View
              style={[
                styles.settingsContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="moon" size={20} color={colors.tabIconDefault} />
                  <ThemedText style={styles.settingLabel}>Dark Mode</ThemedText>
                </View>
                <ThemeToggle />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="language" size={20} color={colors.tabIconDefault} />
                  <ThemedText style={styles.settingLabel}>Show English</ThemedText>
                </View>
                <Toggle
                  value={settings.showEnglish}
                  onValueChange={value => dispatch(setShowEnglish(value))}
                />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="text" size={20} color={colors.tabIconDefault} />
                  <ThemedText style={styles.settingLabel}>Text Size</ThemedText>
                </View>
                <View style={styles.sliderContainer}>
                  <ThemedText
                    style={[styles.scaleText, { color: colors.tabIconDefault }]}
                    skipDefaultColor
                  >
                    {Math.round(settings.fontScale * 100)}%
                  </ThemedText>
                  <CustomSlider
                    value={settings.fontScale}
                    onValueChange={handleFontScaleChange}
                    minimumValue={0.8}
                    maximumValue={1.3}
                    step={0.1}
                    style={styles.slider}
                  />
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.previewContainer}>
                <ThemedText style={styles.previewLabel}>Article Text Preview</ThemedText>
                <View style={{ height: 100, overflow: 'hidden' }}>
                  <View style={{ position: 'absolute', width: '100%', top: 0 }}>
                    <ThemedText
                      style={[styles.arabicPreviewText, previewTextStyles.arabic]}
                      skipDefaultColor
                    >
                      مرحباً بك في اللغة العربية
                    </ThemedText>
                    {settings.showEnglish ? (
                      <ThemedText
                        style={[styles.englishPreviewText, previewTextStyles.english]}
                        skipDefaultColor
                      >
                        Welcome to the Arabic language
                      </ThemedText>
                    ) : (
                      <ThemedText
                        style={[styles.englishPreviewText, previewTextStyles.hiddenEnglish]}
                      >
                        Welcome to the Arabic language
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Connect Section */}
            <View
              style={[
                styles.connectContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                  marginTop: LAYOUT.SPACING.MEDIUM,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <ThemedButton
                variant="outlined"
                title="Twitter"
                onPress={() => handleSocialLink('https://twitter.com/openarabicio')}
                icon="logo-twitter"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Instagram"
                onPress={() => handleSocialLink('https://instagram.com/openarabic.io')}
                icon="logo-instagram"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Facebook"
                onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
                icon="logo-facebook"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
            </View>

            {/* Support & Account Section */}
            <View
              style={[
                styles.actionsContainer,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.cardBorder,
                  marginTop: LAYOUT.SPACING.MEDIUM,
                },
                LAYOUT.SHADOW.MEDIUM,
              ]}
            >
              <ThemedButton
                variant="outlined"
                title="Contact Support"
                onPress={handleSupport}
                icon="mail"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <ThemedButton
                variant="outlined"
                title="Sign Out"
                onPress={signOut}
                icon="log-out"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={styles.accountInfoContainer}>
                <ThemedText style={styles.signedInLabel}>Signed in as:</ThemedText>
                <ThemedText style={styles.signedInEmail} numberOfLines={1} ellipsizeMode="tail">
                  {session.user.email}
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  welcomeTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
    textAlign: 'center',
  },
  settingsContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    marginLeft: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
  divider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    width: '100%',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scaleText: {
    width: 45,
    textAlign: 'right',
    marginRight: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
  previewContainer: {
    padding: LAYOUT.SPACING.SMALL,
  },
  previewLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  arabicPreviewText: {
    textAlign: 'right',
    marginBottom: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
  englishPreviewText: {
    textAlign: 'left',
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    paddingVertical: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
  connectContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  actionsContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
  },
  actionButton: {
    borderWidth: 0,
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  accountInfoContainer: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  signedInLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  signedInEmail: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
