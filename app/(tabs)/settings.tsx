// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, memo } from 'react';
import { Alert, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import Constants from 'expo-constants';
import pkg from '../../package.json';
import * as Linking from 'expo-linking';

import BaseCard from '@/components/BaseCard';
import { CustomSlider } from '@/components/Slider';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toggle } from '@/components/Toggle';
import { LAYOUT } from '@/constants/layout';
import { useLoadingState } from '@/hooks';
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
  readonly iconColor?: string;
}

const SettingLabel = memo(({ icon, text, iconColor }: SettingLabelProps) => {
  const colors = useColors();
  const defaultIconColor = iconColor || colors.textSecondary;

  return (
    <View style={styles.settingLabelContainer}>
      <Ionicons name={icon} size={22} color={defaultIconColor} />
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

const SettingsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Simple loading state for session loading
  const { startLoading, stopLoading } = useLoadingState(false);

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
  }, [analytics, supabase, router, startLoading, stopLoading]);

  // Simple handlers
  const handleSupport = () => {
    Linking.openURL('mailto:yunus@edenmind.com');
  };

  const handleSocialLink = (url: string) => {
    Linking.openURL(url);
  };

  // Button styles

  const packageVersion = pkg.version;

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Settings screen"
    >
      <ThemedView
        useSafeArea={false}
        includeBottomInset={false}
        style={styles.flexOne}
        scrollable={true}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Preferences Section */}
        <View style={styles.settingsWrapper}>
          <BaseCard
            style={styles.settingsContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
                Interface
              </ThemedText>
            </View>

            <View style={styles.settingRow}>
              <SettingLabel icon="moon" text="Dark Mode" iconColor={colors.icon} />
              <ThemeToggle />
            </View>
            <Divider />
            <View style={styles.settingRow}>
              <SettingLabel icon="language" text="English Translation" iconColor={colors.icon} />
              <Toggle
                value={settings.showEnglish}
                onValueChange={value => dispatch(setShowEnglish(value))}
              />
            </View>
            <Divider />
            <View style={styles.settingRow}>
              <SettingLabel icon="text" text="Text Size" iconColor={colors.icon} />
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
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
                Connect
              </ThemedText>
            </View>

            {/* Social Links */}
            <View style={styles.socialLinksContainer}>
              <BaseCard
                onPress={() => handleSocialLink('https://twitter.com/OpenArabicIo')}
                style={styles.socialLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons name="logo-twitter" size={22} color={colors.socialTwitter} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Twitter
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
                style={styles.socialLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons name="logo-facebook" size={22} color={colors.socialFacebook} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Facebook
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                onPress={() => handleSocialLink('https://www.instagram.com/openarabic.io/')}
                style={styles.socialLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons name="logo-instagram" size={22} color={colors.socialInstagram} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Instagram
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Support & Account Section */}
        <View style={styles.actionsWrapper}>
          <BaseCard
            style={styles.actionsContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
                Support & Account
              </ThemedText>
            </View>

            {/* Action Links */}
            <View style={styles.actionLinksContainer}>
              <BaseCard
                onPress={handleSupport}
                style={styles.actionLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="mail" size={22} color={colors.info} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.actionLinkText}>
                      Support
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                onPress={handleSignOut}
                style={styles.actionLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="log-out" size={22} color={colors.error} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.actionLinkText}>
                      Sign Out
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* App Version */}
        <View style={styles.versionWrapper}>
          <ThemedText type="caption" variant="subtle" style={styles.versionText}>
            Version {(Constants.expoConfig as any)?.version || packageVersion || '1446.0.0'}
          </ThemedText>
        </View>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    overflow: 'hidden',
  },
  actionsWrapper: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  arabicPreviewText: {
    flexShrink: 0,
    marginBottom: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  commonDivider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    opacity: LAYOUT.OPACITY.MEDIUM,
    width: '100%',
  },
  connectContainer: {
    overflow: 'hidden',
  },
  connectWrapper: {
    marginBottom: LAYOUT.SPACING.XLARGE,
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
  } as ViewStyle & TextStyle,
  listContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  mediumHighOpacity: {
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  } as ViewStyle & TextStyle,
  previewContainer: {
    padding: LAYOUT.SPACING.SMALL,
  },
  previewContent: {
    position: 'absolute',
    top: 0,
    width: '100%',
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
  settingLabelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  settingLabelTextContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  settingIconContainer: {
    padding: LAYOUT.SPACING.TINY,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '50%',
  },
  sliderWrapper: {
    flex: 1,
  },
  versionText: {
    marginTop: LAYOUT.SPACING.TINY,
    letterSpacing: 0.5,
  },
  versionWrapper: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.XLARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  sectionHeader: {
    padding: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  sectionTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  socialLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  socialLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    padding: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XTINY,
  },
  socialLinkContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialLinkLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  socialIconContainer: {
    padding: LAYOUT.SPACING.TINY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLinkText: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  socialLinkChevron: {
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  actionLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  actionLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    padding: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.XTINY,
  },
  actionLinkContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionLinkLeft: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionIconContainer: {
    padding: LAYOUT.SPACING.TINY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLinkText: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  actionLinkChevron: {
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
});

export default SettingsScreen;
