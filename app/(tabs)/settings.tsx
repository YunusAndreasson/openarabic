import { Ionicons } from '@expo/vector-icons';
import { createClient } from '@supabase/supabase-js';
import React, { useCallback, useEffect, memo } from 'react';
import { StyleSheet, Alert, Linking, View, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { UnifiedSignInScreen } from '@/components/UnifiedSignInScreen';
import { useScreenAnimation, useOpacityAnimation } from '@/hooks/animations';
import { useAuth } from '@/hooks/useAuth';
import { lightFeedback } from '@/utils/haptics';

import PageHeader from '../../components/PageHeader';
import { CustomSlider } from '../../components/Slider';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ThemedButton } from '../../components/ThemedButton';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { Toggle } from '../../components/Toggle';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../constants/Supabase';
import { LAYOUT, getHeaderHeight } from '../../constants/layout';
import { useLoadingState } from '../../hooks';
import { useColors } from '../../hooks/useColors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setFontScale, setShowEnglish } from '../../store/settingsSlice';

// Create a Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
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

  // Simple fade animation
  const { fadeInStyle } = useScreenAnimation(true, isLoadingState);

  // Fade animations for UI elements that depend on Redux store data
  const { animatedStyle: themeToggleFade } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
    autoStart: hasConcreteValues && !isLoadingState && !isAuthLoading,
    delay: 100,
  });

  const { animatedStyle: englishToggleFade } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
    autoStart: hasConcreteValues && !isLoadingState && !isAuthLoading,
    delay: 150,
  });

  const { animatedStyle: sliderFade } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 150,
    autoStart: hasConcreteValues && !isLoadingState && !isAuthLoading,
    delay: 200,
  });

  // Empty style object for animated views
  const emptyStyle = {};

  // Load session effect replaced with useAuth hook
  useEffect(() => {
    if (isAuthLoading) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isAuthLoading, startLoading, stopLoading]);

  // Add effect to ensure animations start properly after settings are loaded
  useEffect(() => {
    if (hasConcreteValues && !isLoadingState && !isAuthLoading) {
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
  }, [
    hasConcreteValues,
    isLoadingState,
    isAuthLoading,
    themeToggleFade,
    englishToggleFade,
    sliderFade,
  ]);

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

  // Show loading if we don't have valid settings
  if (!hasConcreteValues) {
    return (
      <Animated.View style={[styles.flexOne, fadeInStyle]}>
        <ThemedView style={styles.container}>
          <PageHeader title="Settings" />
        </ThemedView>
      </Animated.View>
    );
  }

  // Show if not signed in
  if (!user) {
    return <UnifiedSignInScreen headerTitle="Settings" colors={colors} />;
  }

  // Button styles
  const buttonStyles = {
    innerContainer: {
      justifyContent: 'flex-start' as const,
      alignItems: 'flex-start' as const,
      paddingVertical: LAYOUT.SPACING.TINY,
    },
    contentContainer: {
      justifyContent: 'flex-start' as const,
      alignItems: 'flex-start' as const,
      paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    },
  };

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
              <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />
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
