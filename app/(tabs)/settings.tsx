// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, memo } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { LoadingScreen } from '@/components/Loader';
import PageHeader from '@/components/PageHeader';
import { CustomSlider } from '@/components/Slider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Toggle } from '@/components/Toggle';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useLoadingState } from '@/hooks';
import { useOpacityAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFontScale, setShowEnglish } from '@/store/settingsSlice';
import { lightFeedback } from '@/utils/haptics';

// Memoize static components to prevent unnecessary re-renders
interface SettingLabelProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
}

const SettingLabel = memo(({ icon, text }: SettingLabelProps) => {
  const colors = useColors();
  return (
    <View style={styles.settingLabelContainer}>
      <Ionicons name={icon} size={20} color={colors.tabIconDefault} />
      <View style={styles.settingLabelTextContainer}>
        <ThemedText type="body">{text}</ThemedText>
      </View>
    </View>
  );
});
SettingLabel.displayName = 'SettingLabel';

// Memoize divider component
const Divider = memo(() => {
  const colors = useColors();
  return <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />;
});
Divider.displayName = 'Divider';

export default function SettingsScreen(): JSX.Element {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const insets = useSafeAreaInsets();

  // Simple loading state for session loading
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState(false);

  // Check if we have concrete values
  const hasConcreteValues =
    settings &&
    typeof settings.fontScale === 'number' &&
    !Number.isNaN(settings.fontScale) &&
    settings.fontScale >= 0.8 &&
    settings.fontScale <= 1.3 &&
    typeof settings.showEnglish === 'boolean';

  // Fade animations for UI elements that depend on Redux store data
  const { animatedStyle: themeToggleFade } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
    autoStart: hasConcreteValues && !isLoadingState,
    delay: 100,
  });

  const { animatedStyle: englishToggleFade } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
    autoStart: hasConcreteValues && !isLoadingState,
    delay: 150,
  });

  const { animatedStyle: sliderFade } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
    autoStart: hasConcreteValues && !isLoadingState,
    delay: 200,
  });

  // Empty style object for animated views
  const emptyStyle = {};

  // Add effect to ensure animations start properly after settings are loaded
  useEffect(() => {
    if (hasConcreteValues && !isLoadingState) {
      // Small delay to ensure animations run smoothly
      const timer = setTimeout(() => {
        // Re-trigger animations if needed
        if (themeToggleFade && englishToggleFade && sliderFade) {
          // Animation will restart based on opacity hooks
        }
      }, 150);
      return () => clearTimeout(timer);
    }
    return undefined; // Add return for when condition is not met
  }, [hasConcreteValues, isLoadingState, themeToggleFade, englishToggleFade, sliderFade]);

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
              // Track sign out event before signing out
              await analytics.trackSignOut();

              // Sign out from Supabase
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', error.message);
                return;
              }

              // Reset analytics
              await analytics.reset();

              // Navigate to auth screen (no leading slash)
              router.replace('auth');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
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

  // Show loading if we don't have valid settings
  if (!hasConcreteValues) {
    return <LoadingScreen />;
  }

  // Button styles

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
                <Animated.View style={[emptyStyle, themeToggleFade]}>
                  <ThemeToggle />
                </Animated.View>
              </View>
              <Divider />
              <View style={styles.settingRow}>
                <SettingLabel icon="language" text="English Translation" />
                <Animated.View style={[emptyStyle, englishToggleFade]}>
                  <Toggle
                    value={settings.showEnglish}
                    onValueChange={value => dispatch(setShowEnglish(value))}
                  />
                </Animated.View>
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
                    <Animated.View style={[emptyStyle, sliderFade]}>
                      <CustomSlider
                        value={settings.fontScale}
                        onValueChange={handleFontScaleChange}
                        minimumValue={0.8}
                        maximumValue={1.3}
                        step={0.1}
                        style={styles.slider}
                      />
                    </Animated.View>
                  </View>
                </View>
              </View>
              <Divider />
              <View style={styles.previewContainer}>
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
                        style={[styles.englishPreviewText, styles.mediumHighOpacity]}
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
                style={styles.actionButton}
                innerContainerStyle={styles.buttonInnerContainer}
                contentContainerStyle={styles.buttonContentContainer}
              />
              <Divider />
              <ThemedButton
                variant="outlined"
                title="Facebook"
                onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
                icon="logo-facebook"
                textWeight="normal"
                style={styles.actionButton}
                innerContainerStyle={styles.buttonInnerContainer}
                contentContainerStyle={styles.buttonContentContainer}
              />
              <Divider />
              <ThemedButton
                variant="outlined"
                title="Instagram"
                onPress={() => handleSocialLink('https://www.instagram.com/openarabic.io/')}
                icon="logo-instagram"
                textWeight="normal"
                style={styles.actionButton}
                innerContainerStyle={styles.buttonInnerContainer}
                contentContainerStyle={styles.buttonContentContainer}
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
                style={styles.actionButton}
                innerContainerStyle={styles.buttonInnerContainer}
                contentContainerStyle={styles.buttonContentContainer}
              />
              <Divider />
              <ThemedButton
                variant="outlined"
                title="Sign Out"
                onPress={handleSignOut}
                icon="log-out"
                textWeight="normal"
                style={styles.actionButton}
                innerContainerStyle={styles.buttonInnerContainer}
                contentContainerStyle={styles.buttonContentContainer}
              />
            </BaseCard>
          </View>
        </ScrollView>
      </ThemedView>
      <PageHeader title="Settings" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  actionsContainer: {
    overflow: 'hidden',
  },
  actionsWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  arabicPreviewText: {
    flexShrink: 0,
    marginBottom: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  buttonContentContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  buttonInnerContainer: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  commonDivider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    opacity: LAYOUT.OPACITY.MEDIUM,
    width: `${LAYOUT.WIDTH_RATIOS.FULL * 100}%`,
  },
  connectContainer: {
    overflow: 'hidden',
  },
  connectWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    flex: 1,
  },
  englishPreviewText: {
    flexShrink: 0,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  flexOne: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  listContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  mediumHighOpacity: {
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  previewContainer: {
    padding: LAYOUT.SPACING.SMALL,
  },
  previewContent: {
    position: 'absolute',
    top: 0,
    width: `${LAYOUT.WIDTH_RATIOS.FULL * 100}%`,
  },
  previewWrapper: {
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
  },
  scaleText: {
    marginRight: LAYOUT.SPACING.SMALL,
    width: 45,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  settingLabelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  settingLabelTextContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  settingsContainer: {
    overflow: 'hidden',
  },
  settingsWrapper: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    width: `${LAYOUT.WIDTH_RATIOS.HALF * 100}%`,
  },
  sliderWrapper: {
    flex: 1,
  },
});
