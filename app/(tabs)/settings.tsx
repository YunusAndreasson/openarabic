import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Alert, Linking, View, ScrollView } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFontScale, setShowEnglish } from '../../store/settingsSlice';
import Auth from '../../components/Auth';
import { useColors } from '../../hooks/useColors';
import { LAYOUT, getHeaderHeight } from '../../constants/layout';
import { useLoadingState } from '../../hooks';
import { useScreenAnimation } from '@/hooks/animations';
import PageHeader from '../../components/PageHeader';
import { lightFeedback } from '@/utils/haptics';
import BaseCard from '@/components/BaseCard';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants/Supabase';
import { ThemeToggle } from '../../components/ThemeToggle';
import { CustomSlider } from '../../components/Slider';
import { Toggle } from '../../components/Toggle';
import { ThemedButton } from '../../components/ThemedButton';
import { useFocusEffect } from '@react-navigation/native';

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SettingsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const theme = useAppSelector(state => state.theme.theme);
  const insets = useSafeAreaInsets();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Add state to defer rendering of toggle components until theme is loaded
  const [deferredRender, setDeferredRender] = useState(false);

  // Use the new loading state hook with minimal loading time
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState(); // Using default values (80ms, true)

  // Use the new screen animation hook
  const { fadeInStyle } = useScreenAnimation(
    true, // Always ready to display
    isLoadingState
    // Using default values for remaining parameters
  );

  // Add effect to defer toggle rendering until theme state is loaded
  useEffect(() => {
    if (theme !== null && !deferredRender) {
      setDeferredRender(true);
    }
  }, [theme, deferredRender]);

  const loadSession = useCallback(async () => {
    startLoading();
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
    } catch (_err) {
      setSession(null);
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  // Use focus effect to only load session when tab is focused
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const subscription = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setSession(session);
        }
      });

      loadSession();

      return () => {
        mounted = false;
        subscription.data.subscription.unsubscribe();
      };
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

  async function signOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure?',
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
        lightFeedback();
      }

      dispatch(setFontScale(value));
    },
    [settings.fontScale, dispatch]
  );

  // Use cached data to render a skeleton while loading instead of the full loading screen
  if (isLoadingState) {
    return (
      <Animated.View style={[styles.flexOne, fadeInStyle]}>
        <ThemedView style={styles.container}>
          <PageHeader title="Settings" />
        </ThemedView>
      </Animated.View>
    );
  }

  // Skip the sign-in check so settings are always accessible
  // Auth features will be shown conditionally in the UI if session exists
  const showAuthUI = !session;

  // Create placeholder component to show while theme is loading
  const TogglePlaceholder = () => (
    <View style={[styles.togglePlaceholder, { backgroundColor: colors.cardBorder }]} />
  );

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <ThemedView
        useSafeArea={false}
        includeBottomInset={false}
        style={{ flex: 1 }}
        scrollable={true}
        contentContainerStyle={[styles.listContent, { paddingTop: getHeaderHeight(insets) }]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Preferences Section */}
          <View style={styles.settingsWrapper}>
            <BaseCard
              style={styles.settingsContainer}
              shadowSize="small"
              includePressAnimation={false}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="moon" size={20} color={colors.tabIconDefault} />
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">Dark Mode</ThemedText>
                  </View>
                </View>
                {deferredRender ? <ThemeToggle /> : <TogglePlaceholder />}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="language" size={20} color={colors.tabIconDefault} />
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">English Translation</ThemedText>
                  </View>
                </View>
                {deferredRender ? (
                  <Toggle
                    value={settings.showEnglish}
                    onValueChange={value => dispatch(setShowEnglish(value))}
                  />
                ) : (
                  <TogglePlaceholder />
                )}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <Ionicons name="text" size={20} color={colors.tabIconDefault} />
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">Text Size</ThemedText>
                  </View>
                </View>
                <View style={styles.sliderContainer}>
                  <ThemedText
                    type="caption"
                    variant="secondary"
                    align="right"
                    style={styles.scaleText}
                  >
                    {Math.round(settings.fontScale * 100)}%
                  </ThemedText>
                  {deferredRender ? (
                    <CustomSlider
                      value={settings.fontScale}
                      onValueChange={handleFontScaleChange}
                      minimumValue={0.8}
                      maximumValue={1.3}
                      step={0.1}
                      style={styles.slider}
                    />
                  ) : (
                    <View
                      style={[styles.sliderPlaceholder, { backgroundColor: colors.cardBorder }]}
                    />
                  )}
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              <View style={styles.previewContainer}>
                <View style={styles.previewLabelContainer}>
                  <ThemedText type="caption" variant="secondary">
                    Preview
                  </ThemedText>
                </View>
                <View style={styles.previewWrapper}>
                  <View style={styles.previewContent}>
                    <ThemedText
                      type="arabic"
                      arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * settings.fontScale}
                      align="right"
                      skipDefaultColor
                      colorName="arabicText"
                      style={styles.arabicPreviewText}
                    >
                      مرحباً بك في اللغة العربية
                    </ThemedText>
                    {settings.showEnglish ? (
                      <ThemedText
                        type="body"
                        skipDefaultColor
                        colorName="text"
                        align="left"
                        style={[styles.englishPreviewText, { opacity: LAYOUT.OPACITY.MEDIUM_HIGH }]}
                      >
                        Welcome to the Arabic language
                      </ThemedText>
                    ) : (
                      <ThemedText type="body" style={[styles.englishPreviewText, { opacity: 0 }]}>
                        Welcome to the Arabic language
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
            </BaseCard>
          </View>

          {/* Connect Section */}
          <View style={styles.connectWrapper}>
            <BaseCard
              style={styles.connectContainer}
              shadowSize="small"
              includePressAnimation={false}
            >
              <ThemedButton
                variant="outlined"
                title="Twitter"
                onPress={() => handleSocialLink('https://twitter.com/OpenArabicApp')}
                icon="logo-twitter"
                textWeight="normal"
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
                textWeight="normal"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <ThemedButton
                variant="outlined"
                title="Instagram"
                onPress={() => handleSocialLink('https://www.instagram.com/openarabic.io/')}
                icon="logo-instagram"
                textWeight="normal"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
            </BaseCard>
          </View>

          {/* Support & Account Section */}
          <View style={styles.actionsWrapper}>
            <BaseCard
              style={styles.actionsContainer}
              shadowSize="small"
              includePressAnimation={false}
            >
              <ThemedButton
                variant="outlined"
                title="Support"
                onPress={handleSupport}
                icon="mail"
                textWeight="normal"
                style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                innerContainerStyle={buttonStyles.innerContainer}
                contentContainerStyle={buttonStyles.contentContainer}
              />
              <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              {showAuthUI ? (
                <ThemedButton
                  variant="outlined"
                  title="Sign In"
                  onPress={() => setShowAuthModal(true)}
                  icon="log-in"
                  textWeight="normal"
                  style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                  innerContainerStyle={buttonStyles.innerContainer}
                  contentContainerStyle={buttonStyles.contentContainer}
                />
              ) : (
                <ThemedButton
                  variant="outlined"
                  title="Sign Out"
                  onPress={signOut}
                  icon="log-out"
                  textWeight="normal"
                  style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
                  innerContainerStyle={buttonStyles.innerContainer}
                  contentContainerStyle={buttonStyles.contentContainer}
                />
              )}
            </BaseCard>
          </View>
        </ScrollView>
      </ThemedView>
      <PageHeader title="Settings" />
      {showAuthModal && (
        <ThemedView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            padding: LAYOUT.SPACING.LARGE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText
            type="heading2"
            weight="600"
            align="center"
            style={{ marginBottom: LAYOUT.SPACING.LARGE }}
          >
            Sign In
          </ThemedText>
          <Auth />
          <ThemedButton
            title="Close"
            onPress={() => setShowAuthModal(false)}
            style={{ marginTop: LAYOUT.SPACING.LARGE }}
          />
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    padding: LAYOUT.SCREEN_EDGE_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleContainer: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  settingsWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  settingsContainer: {
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
  settingLabelTextContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  divider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    width: `${LAYOUT.WIDTH_RATIOS.FULL * 100}%`,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: `${LAYOUT.WIDTH_RATIOS.HALF * 100}%`,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scaleText: {
    width: 45,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  previewContainer: {
    padding: LAYOUT.SPACING.SMALL,
  },
  previewLabelContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  previewWrapper: {
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
  },
  previewContent: {
    position: 'absolute',
    width: `${LAYOUT.WIDTH_RATIOS.FULL * 100}%`,
    top: 0,
  },
  arabicPreviewText: {
    marginBottom: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
  englishPreviewText: {
    paddingVertical: LAYOUT.SPACING.TINY,
    flexShrink: 0,
  },
  connectWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  connectContainer: {
    overflow: 'hidden',
  },
  actionsWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  actionsContainer: {
    overflow: 'hidden',
  },
  actionButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  togglePlaceholder: {
    width: LAYOUT.BUTTON.HEIGHT.SMALL * 1.75 - 4,
    height: LAYOUT.BUTTON.HEIGHT.SMALL - 4,
    borderRadius: (LAYOUT.BUTTON.HEIGHT.SMALL - 4) / 2,
    opacity: LAYOUT.OPACITY.XLIGHT,
  },
  sliderPlaceholder: {
    flex: 1,
    height: 4,
    borderRadius: LAYOUT.BORDER_RADIUS.XSMALL / 2,
    opacity: LAYOUT.OPACITY.XLIGHT * 2,
  },
});
