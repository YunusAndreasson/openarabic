// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, memo, useMemo, useEffect, useState } from 'react';
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
import { TimePicker } from '@/components/TimePicker';
import { LAYOUT } from '@/constants/layout';
import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFontScale, setShowEnglish } from '@/store/settingsSlice';
import { lightFeedback } from '@/utils/haptics';
import SectionTitle from '@/components/SectionTitle';

// Memoized components
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

const Divider = memo(() => {
  const colors = useColors();
  return <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />;
});
Divider.displayName = 'Divider';

const AccountScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermissions, setNotificationPermissions] = useState(false);
  const { user } = useAuth();

  // User display logic
  const displayName = useMemo(() => {
    if (!user?.email) return 'Anonymous User';

    const emailPrefix = user.email.split('@')[0];
    if (!emailPrefix) return 'Anonymous User';

    const parts = emailPrefix.split(/[._-]/).filter(part => Boolean(part && part.length > 0));

    if (parts.length === 0) return 'User';

    return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }, [user?.email]);

  // Sign out handler
  const handleSignOut = useCallback(() => {
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
            try {
              await analytics.trackSignOut();
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', error.message);
                return;
              }
              await analytics.reset();
              router.replace('auth');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

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

  const handleReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled && !notificationPermissions) {
        Alert.alert(
          'Notification Permission Required',
          'Please allow notifications to receive daily study alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
        return;
      }

      const newReminderTime = { ...reminderTime, enabled };
      await updateReminderTime(newReminderTime);
      lightFeedback();
    },
    [reminderTime, updateReminderTime, notificationPermissions]
  );

  // Check notification permissions
  useEffect(() => {
    const checkNotificationPermissions = async () => {
      try {
        const { hasPermissions } = await import('@/services/notificationService');
        const permissionsGranted = await hasPermissions();
        setNotificationPermissions(permissionsGranted);
      } catch (error) {
        console.error('Failed to check notification permissions:', error);
        setNotificationPermissions(false);
      }
    };

    checkNotificationPermissions();
  }, []);

  const handleTimePickerOpen = useCallback(() => {
    setShowTimePicker(true);
    lightFeedback();
  }, []);

  const handleTimePickerClose = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimeSet = useCallback(
    async (hour: number, minute: number) => {
      const newReminderTime = { ...reminderTime, hour, minute };
      await updateReminderTime(newReminderTime);
      setShowTimePicker(false);
      lightFeedback();
    },
    [reminderTime, updateReminderTime]
  );

  const handleSupportContact = useCallback(() => {
    Linking.openURL('mailto:yunus@edenmind.com');
  }, []);

  const handleSocialLink = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const appVersion = pkg.version;

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Account screen"
    >
      <ThemedView
        useSafeArea={false}
        includeBottomInset={false}
        style={styles.flexOne}
        scrollable={true}
        contentContainerStyle={[
          styles.scrollContent,
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
        {/* Appearance Section */}
        <View style={styles.appearanceWrapper}>
          <SectionTitle title="Appearance" isFirstSection={true} />
          <BaseCard
            style={styles.sectionContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.appearanceLinksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel icon="moon" text="Dark Mode" iconColor={colors.icon} />
                <ThemeToggle />
              </View>
            </View>
          </BaseCard>
        </View>

        {/* Reading Section */}
        <View style={styles.readingWrapper}>
          <SectionTitle title="Reading" />
          <BaseCard
            style={styles.sectionContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.readingLinksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel icon="eye" text="English Translation" iconColor={colors.icon} />
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
            </View>
          </BaseCard>
        </View>

        {/* Notifications Section */}
        <View style={styles.remindersWrapper}>
          <SectionTitle title="Notifications" />
          <BaseCard
            style={styles.sectionContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.remindersLinksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel
                  icon="notifications"
                  text="Daily Study Alerts"
                  iconColor={colors.icon}
                />
                <Toggle value={reminderTime.enabled} onValueChange={handleReminderToggle} />
              </View>
              {reminderTime.enabled && (
                <>
                  <Divider />
                  <BaseCard
                    onPress={handleTimePickerOpen}
                    style={styles.timePickerSettingRow}
                    shadowSize="none"
                    includePressAnimation={true}
                  >
                    <View style={styles.settingRow}>
                      <SettingLabel icon="time" text="Notification Time" iconColor={colors.icon} />
                      <ThemedText type="body" variant="secondary">
                        {formatReminderTime(reminderTime.hour, reminderTime.minute)}
                      </ThemedText>
                    </View>
                  </BaseCard>
                </>
              )}
            </View>
          </BaseCard>
        </View>

        {/* Connect Section */}
        <View style={styles.connectWrapper}>
          <SectionTitle title="Connect" />
          <BaseCard
            style={styles.sectionContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
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
                      <Ionicons name="logo-twitter" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Twitter
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="open-outline"
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
                      <Ionicons name="logo-facebook" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Facebook
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="open-outline"
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
                      <Ionicons name="logo-instagram" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Instagram
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                onPress={handleSupportContact}
                style={styles.socialLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons name="mail" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.socialLinkText}>
                      Email
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.textTertiary}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Science Section */}
        <View style={styles.infoWrapper}>
          <SectionTitle title="Science" />
          <BaseCard
            style={styles.sectionContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.actionLinksContainer}>
              <BaseCard
                onPress={() => router.push('/learning-method')}
                style={styles.actionLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="school-outline" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.actionLinkText}>
                      The Science of Language Learning
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                onPress={() => router.push('/classical-texts')}
                style={styles.actionLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="library-outline" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.actionLinkText}>
                      Why Classical Texts Work Best
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Manage Section */}
        <View style={styles.manageWrapper}>
          <SectionTitle title="Manage" />
          <BaseCard
            style={styles.sectionContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.manageLinksContainer}>
              <BaseCard
                onPress={handleSignOut}
                style={styles.actionLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="log-out-outline" size={22} color={colors.error} />
                    </View>
                    <View style={styles.signOutTextContainer}>
                      <ThemedText type="body" weight="medium" style={styles.signOutTitleText}>
                        Sign Out
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        colorName="textTertiary"
                        style={styles.userEmailText}
                      >
                        {user?.email || 'No email'}
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward-outline"
                    size={20}
                    color={colors.textTertiary}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* App Footer */}
        <View style={styles.appFooterWrapper}>
          <View style={styles.appFooterContent}>
            <ThemedText type="caption" colorName="tabIconDefault" style={styles.versionText}>
              Version {Constants.expoConfig?.version || appVersion || '1446.0.0'}
            </ThemedText>
            <ThemedText type="caption" colorName="tabIconDefault" style={styles.copyrightText}>
              © 2025 OpenArabic
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Time Picker Modal */}
      <TimePicker
        isVisible={showTimePicker}
        onClose={handleTimePickerClose}
        onTimeSet={handleTimeSet}
        initialHour={reminderTime.hour}
        initialMinute={reminderTime.minute}
        title="Set Notification Time"
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  scrollView: {
    flex: 1,
  },

  // Account Header Styles
  accountHeaderWrapper: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  accountContainer: {
    overflow: 'hidden',
  },
  accountLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  actionLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.SIZE,
  },
  actionLinkContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionLinkLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
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
    opacity: LAYOUT.OPACITY.MEDIUM,
    minWidth: LAYOUT.SPACING.XLARGE,
    textAlign: 'center',
    marginRight: LAYOUT.SPACING.TINY,
  },

  // Section Styles
  sectionTitle: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Setting Row Styles
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.SIZE,
  },
  settingLabelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  settingLabelTextContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  commonDivider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    opacity: LAYOUT.OPACITY.MEDIUM,
    width: '100%',
  },

  // Slider Styles
  sliderContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '50%',
  },
  scaleText: {
    marginRight: LAYOUT.SPACING.SMALL,
    width: 45,
  },
  sliderWrapper: {
    flex: 1,
  },
  slider: {
    flex: 1,
    height: 40,
  },

  // Common Section Container Styles
  sectionContainer: {
    overflow: 'hidden',
  },

  // Preview Styles
  previewContainer: {
    padding: LAYOUT.SPACING.SMALL,
  },
  previewWrapper: {
    height: LAYOUT.BUTTON.HEIGHT.LARGE * 2 - LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
  },
  previewContent: {
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  arabicPreviewText: {
    flexShrink: 0,
    marginBottom: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  englishPreviewText: {
    flexShrink: 0,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  mediumHighOpacity: {
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  } as ViewStyle & TextStyle,
  hidden: {
    opacity: 0,
  } as ViewStyle & TextStyle,

  // Common Links Container Styles
  linksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  actionLinksContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  socialLinksContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },

  // Preferences Styles
  appearanceWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },

  // Appearance Links Styles
  appearanceLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Reading Section Styles
  readingWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },
  readingLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Information Section Styles
  infoWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },

  // Connect Styles
  connectWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },

  // Reminders Styles
  remindersWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },
  remindersLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Time Picker Styles
  timePickerSettingRow: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
  },

  // Manage Section Styles
  manageWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },
  manageLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  signOutTextContainer: {
    flexDirection: 'column',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  signOutTitleText: {
    // No additional margin needed since container handles spacing
  },
  userEmailText: {
    marginTop: LAYOUT.SPACING.TINY,
  },

  // Social Link Styles (similar to action links but kept separate for clarity)
  socialLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.SIZE,
  },
  socialLinkContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialLinkLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
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
    opacity: LAYOUT.OPACITY.MEDIUM,
    minWidth: LAYOUT.SPACING.XLARGE,
    textAlign: 'center',
    marginRight: LAYOUT.SPACING.TINY,
  },

  // App Footer Styles
  appFooterWrapper: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.XXLARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  appFooterContent: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  versionText: {
    letterSpacing: 0.4,
    opacity: 0.6,
  },
  copyrightText: {
    letterSpacing: 0.3,
    opacity: 0.4,
    fontSize: 11,
  },
});

export default AccountScreen;
