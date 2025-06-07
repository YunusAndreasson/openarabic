// External Libraries
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useCallback, memo, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import SectionTitle from '@/components/SectionTitle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TimePicker } from '@/components/TimePicker';
import { Toggle } from '@/components/Toggle';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { lightFeedback } from '@/utils/haptics';

import pkg from '../../../../package.json';

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
      <Ionicons color={defaultIconColor} name={icon} size={22} />
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
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermissions, setNotificationPermissions] = useState(false);
  const { user } = useAuth();

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

  const handleReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled && !notificationPermissions) {
        Alert.alert('Enable Notifications', 'Turn on notifications to get daily study reminders.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ]);
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
      accessibilityLabel="Account screen"
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.flexOne}
        useSafeArea={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight - LAYOUT.SPACING.LARGE, // Reduced padding for tighter layout
            paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Notifications Section - Moved to top as most frequently used */}
        <View style={[styles.remindersWrapper, styles.firstSectionOverride]}>
          <SectionTitle isFirstSection={true} title="Notifications" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.remindersLinksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel icon="notifications" iconColor={colors.icon} text="Study Reminders" />
                <Toggle value={reminderTime.enabled} onValueChange={handleReminderToggle} />
              </View>
              {reminderTime.enabled && (
                <>
                  <Divider />
                  <BaseCard
                    includePressAnimation={true}
                    shadowSize="none"
                    style={styles.timePickerSettingRow}
                    onPress={handleTimePickerOpen}
                  >
                    <View style={styles.settingRow}>
                      <SettingLabel icon="time" iconColor={colors.icon} text="Time" />
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

        {/* Appearance Section - Second most frequently used */}
        <View style={styles.appearanceWrapper}>
          <SectionTitle title="Appearance" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.appearanceLinksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel icon="moon" iconColor={colors.icon} text="Dark Mode" />
                <ThemeToggle />
              </View>
            </View>
          </BaseCard>
        </View>

        {/* Science Section - Educational content, valuable for understanding */}
        <View style={styles.infoWrapper}>
          <SectionTitle title="Science" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.actionLinksContainer}>
              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.actionLinkCard}
                onPress={() => router.push('/(tabs)/read/account/learningMethod')}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons color={colors.icon} name="school-outline" size={22} />
                    </View>
                    <ThemedText style={styles.actionLinkText} type="body" weight="medium">
                      Language Learning Science
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="chevron-forward-outline"
                    size={20}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.actionLinkCard}
                onPress={() => router.push('/(tabs)/read/account/classicalTexts')}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons color={colors.icon} name="library-outline" size={22} />
                    </View>
                    <ThemedText style={styles.actionLinkText} type="body" weight="medium">
                      Why Classical Texts
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="chevron-forward-outline"
                    size={20}
                    style={styles.actionLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Connect Section - Social links, less frequently used */}
        <View style={styles.connectWrapper}>
          <SectionTitle title="Connect" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.socialLinksContainer}>
              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.socialLinkCard}
                onPress={() => handleSocialLink('https://twitter.com/OpenArabicIo')}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons color={colors.icon} name="logo-twitter" size={22} />
                    </View>
                    <ThemedText style={styles.socialLinkText} type="body" weight="medium">
                      Twitter
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.socialLinkCard}
                onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons color={colors.icon} name="logo-facebook" size={22} />
                    </View>
                    <ThemedText style={styles.socialLinkText} type="body" weight="medium">
                      Facebook
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.socialLinkCard}
                onPress={() => handleSocialLink('https://www.instagram.com/openarabic.io/')}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons color={colors.icon} name="logo-instagram" size={22} />
                    </View>
                    <ThemedText style={styles.socialLinkText} type="body" weight="medium">
                      Instagram
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>

              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.socialLinkCard}
                onPress={handleSupportContact}
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialLinkLeft}>
                    <View style={styles.socialIconContainer}>
                      <Ionicons color={colors.icon} name="mail" size={22} />
                    </View>
                    <ThemedText style={styles.socialLinkText} type="body" weight="medium">
                      Email
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.socialLinkChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Manage Section - Kept at bottom as destructive action */}
        <View style={styles.manageWrapper}>
          <SectionTitle title="Manage" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.manageLinksContainer}>
              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.actionLinkCard}
                onPress={handleSignOut}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons color={colors.error} name="log-out-outline" size={22} />
                    </View>
                    <View style={styles.signOutTextContainer}>
                      <ThemedText style={styles.signOutTitleText} type="body" weight="medium">
                        Sign Out
                      </ThemedText>
                      <ThemedText
                        colorName="textTertiary"
                        style={styles.userEmailText}
                        type="caption"
                      >
                        {user?.email || 'No email'}
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="chevron-forward-outline"
                    size={20}
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
            <ThemedText colorName="tabIconDefault" style={styles.versionText} type="caption">
              Version {Constants.expoConfig?.version || appVersion || '1446.0.0'}
            </ThemedText>
            <ThemedText colorName="tabIconDefault" style={styles.copyrightText} type="caption">
              © 2025 OpenArabic
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Time Picker Modal */}
      <TimePicker
        initialHour={reminderTime.hour}
        initialMinute={reminderTime.minute}
        isVisible={showTimePicker}
        title="Set Time"
        onClose={handleTimePickerClose}
        onTimeSet={handleTimeSet}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  // Common Section Container Styles
  sectionContainer: {
    overflow: 'hidden',
  },

  // Common Links Container Styles
  actionLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  socialLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Action Link Styles
  actionLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.SIZE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  actionLinkText: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  actionLinkChevron: {
    marginRight: LAYOUT.SPACING.SMALL,
    minWidth: LAYOUT.SPACING.XLARGE,
    opacity: LAYOUT.OPACITY.MEDIUM,
    textAlign: 'center',
  },

  // Preferences Styles
  appearanceWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },

  // Appearance Links Styles
  appearanceLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // App Footer Styles
  appFooterWrapper: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
    marginTop: LAYOUT.SPACING.XXLARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  appFooterContent: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },

  // Setting Row Styles
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET.SIZE, // Ensure all setting rows are easily touchable
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
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

  container: {
    flex: 1,
  },

  // Connect Styles
  connectWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },

  copyrightText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.3,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },

  flexOne: {
    flex: 1,
  },

  // Information Section Styles
  infoWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },

  // Manage Section Styles
  manageWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },
  manageLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Reminders Styles
  remindersWrapper: {
    // Remove marginBottom - SectionTitle handles section spacing
  },
  firstSectionOverride: {
    marginTop: -LAYOUT.SPACING.XLARGE, // Offset the SectionTitle's first section margin
  },
  remindersLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  scrollContent: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  scrollView: {
    flex: 1,
  },

  signOutTextContainer: {
    flexDirection: 'column',
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  signOutTitleText: {
    // No additional margin needed since container handles spacing
  },

  // Social Link Styles (similar to action links but kept separate for clarity)
  socialLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.SIZE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  socialLinkText: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  socialLinkChevron: {
    marginRight: LAYOUT.SPACING.SMALL,
    minWidth: LAYOUT.SPACING.XLARGE,
    opacity: LAYOUT.OPACITY.MEDIUM,
    textAlign: 'center',
  },

  // Time Picker Styles
  timePickerSettingRow: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
  },

  userEmailText: {
    marginTop: LAYOUT.SPACING.TINY,
  },

  versionText: {
    letterSpacing: 0.4,
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

export default AccountScreen;
