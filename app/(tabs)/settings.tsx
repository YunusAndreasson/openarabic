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
import { useAppPreloader } from '@/hooks/useAppPreloader';

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Memoize static components to prevent unnecessary re-renders
const SettingLabel = React.memo(({ icon, text }: { icon: string; text: string }) => {
  const colors = useColors();
  return (
    <View style={styles.settingLabelContainer}>
      <Ionicons name={icon as any} size={20} color={colors.tabIconDefault} />
      <View style={styles.settingLabelTextContainer}>
        <ThemedText type="body">{text}</ThemedText>
      </View>
    </View>
  );
});
SettingLabel.displayName = 'SettingLabel';

// Memoize divider component
const Divider = React.memo(() => {
  const colors = useColors();
  return <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />;
});
Divider.displayName = 'Divider';

export default function SettingsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const colors = useColors();
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const insets = useSafeAreaInsets();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { settingsReady } = useAppPreloader();

  // Use the loading state hook with minimal loading time
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

  // Use screen animation for coordinated animations with layout readiness check
  const { isLayoutReady, fadeInStyle, shouldRenderAnimatedContent, triggerAnimations } =
    useScreenAnimation(
      true, // Always ready to display
      isLoadingState,
      80, // Fast animation duration
      50, // Small layout delay to ensure stability
      0 // No animation delay
    );

  // Memoize the animation trigger function to prevent unnecessary re-renders
  const startAnimations = useCallback(() => {
    triggerAnimations();
  }, [triggerAnimations]);

  // Load session and trigger animations
  const loadSession = useCallback(async () => {
    startLoading();
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
    } catch (_err) {
      setSession(null);
    } finally {
      stopLoading();
      // Only trigger animations when layout is ready
      if (isLayoutReady) {
        startAnimations();
      }
    }
  }, [startLoading, stopLoading, startAnimations, isLayoutReady]);

  // Effect to trigger animations when layout becomes ready
  useEffect(() => {
    if (isLayoutReady && !isLoadingState) {
      startAnimations();
    }
  }, [isLayoutReady, isLoadingState, startAnimations]);

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

  // Memoize button styles
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

  // Keep memoization for handlers with dependencies or complex logic
  const handleFontScaleChange = useCallback(
    (value: number) => {
      const previousScale = settings.fontScale;
      if (Math.abs(value - previousScale) >= 0.1) {
        lightFeedback();
      }
      dispatch(setFontScale(value));
    },
    [settings.fontScale, dispatch]
  );

  const handleSignOut = useCallback(() => {
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
  }, [startLoading, stopLoading]);

  // Simple handlers
  const handleSupport = () => {
    Linking.openURL('mailto:yunus@edenmind.com');
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url);
  };

  // Use cached data to render a skeleton while loading or layout not ready or settings not ready
  if (isLoadingState || !isLayoutReady || !settingsReady) {
    return (
      <Animated.View style={[styles.flexOne, fadeInStyle]}>
        <ThemedView style={styles.container}>
          <PageHeader title="Settings" />
        </ThemedView>
      </Animated.View>
    );
  }

  // Skip the sign-in check so settings are always accessible
  const showAuthUI = !session;

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <ThemedView
        useSafeArea={false}
        includeBottomInset={false}
        style={styles.flexOne}
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
                <SettingLabel icon="moon" text="Dark Mode" />
                <ThemeToggle />
              </View>
              <Divider />
              <View style={styles.settingRow}>
                <SettingLabel icon="language" text="English Translation" />
                <Toggle
                  value={settings.showEnglish}
                  onValueChange={value => dispatch(setShowEnglish(value))}
                />
              </View>
              <Divider />
              <View style={styles.settingRow}>
                <SettingLabel icon="text" text="Text Size" />
                <View style={styles.sliderContainer}>
                  <ThemedText
                    type="caption"
                    variant="secondary"
                    align="right"
                    style={styles.scaleText}
                  >
                    {Math.round(settings.fontScale * 100)}%
                  </ThemedText>
                  <View style={styles.sliderWrapper}>
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
              </View>
              <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />
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
                      <ThemedText type="body" style={[styles.englishPreviewText, styles.hidden]}>
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
              <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />
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
              <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />
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
              <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />
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
                  onPress={handleSignOut}
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
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <ThemedText type="heading2" weight="600" align="center" style={styles.modalTitle}>
            Sign In
          </ThemedText>
          <Auth />
          <ThemedButton
            title="Close"
            onPress={() => setShowAuthModal(false)}
            style={styles.modalCloseButton}
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
  commonDivider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    width: `${LAYOUT.WIDTH_RATIOS.FULL * 100}%`,
    opacity: LAYOUT.OPACITY.MEDIUM,
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
  sliderWrapper: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  hidden: {
    opacity: 0,
  },
  modalTitle: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  modalCloseButton: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
});
