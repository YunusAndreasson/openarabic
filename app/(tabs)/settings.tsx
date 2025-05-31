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
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFontScale, setShowEnglish } from '@/store/settingsSlice';
import { lightFeedback } from '@/utils/haptics';

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

// User initials badge component
interface UserInitialsBadgeProps {
  readonly email?: string;
  readonly size?: number;
}

const UserInitialsBadge = memo(({ email, size = 88 }: UserInitialsBadgeProps) => {
  const colors = useColors();

  const initials = useMemo(() => {
    if (!email || email.length === 0) return '?';

    try {
      const emailPrefix = email.split('@')[0];
      if (!emailPrefix) return '?';

      const parts = emailPrefix.split(/[._-]/).filter(part => part && part.length > 0);

      if (parts.length >= 2) {
        const firstInitial = parts[0]?.[0];
        const secondInitial = parts[1]?.[0];
        if (firstInitial && secondInitial) {
          return (firstInitial + secondInitial).toUpperCase();
        }
      }

      const firstChar = emailPrefix[0];
      return firstChar ? firstChar.toUpperCase() : '?';
    } catch {
      return '?';
    }
  }, [email]);

  const badgeStyle = useMemo(
    () => [
      styles.userInitialsBadge,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.progressIndicator,
        shadowColor: colors.shadow,
      },
    ],
    [size, colors.progressIndicator, colors.shadow]
  );

  const textStyle = useMemo(
    () => [
      styles.userInitialsBadgeText,
      {
        fontSize: size * 0.48,
        color: colors.background,
        lineHeight: size * 0.48,
      },
    ],
    [size, colors.background]
  );

  return (
    <View style={badgeStyle}>
      <ThemedText style={textStyle} weight="bold">
        {initials}
      </ThemedText>
    </View>
  );
});
UserInitialsBadge.displayName = 'UserInitialsBadge';

// Account header component
const AccountHeader = memo(() => {
  const colors = useColors();
  const { user } = useAuth();
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberSince = async () => {
      if (!user?.id) return;

      try {
        if (user.user_metadata && typeof user.user_metadata === 'object') {
          const metadata = user.user_metadata as Record<string, unknown>;
          const createdAt = metadata.created_at;

          if (typeof createdAt === 'string') {
            const date = new Date(createdAt);
            if (!isNaN(date.getTime())) {
              setMemberSince(
                date.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
              );
              return;
            }
          }
        }

        const currentDate = new Date();
        setMemberSince(
          currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        );
      } catch (error) {
        // Silently handle error and use fallback
        setMemberSince('Recently');
      }
    };

    fetchMemberSince();
  }, [user?.id, user?.user_metadata]);

  const userEmail = user?.email || 'No email';
  const displayName = useMemo(() => {
    if (!user?.email) return 'Anonymous User';

    const emailPrefix = user.email.split('@')[0];
    if (!emailPrefix) return 'Anonymous User';

    const parts = emailPrefix.split(/[._-]/).filter(part => Boolean(part && part.length > 0));

    if (parts.length === 0) return 'User';

    return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }, [user?.email]);

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

  return (
    <View style={styles.accountHeader}>
      <View style={styles.accountProfileSection}>
        <UserInitialsBadge email={user?.email} size={88} />
        <View style={styles.accountUserInfo}>
          <ThemedText
            type="heading3"
            weight="bold"
            numberOfLines={1}
            style={styles.accountUserName}
          >
            {displayName}
          </ThemedText>
          <ThemedText
            type="body"
            variant="secondary"
            numberOfLines={1}
            style={styles.accountUserEmail}
          >
            {userEmail}
          </ThemedText>
          {memberSince && (
            <ThemedText type="caption" variant="subtle" style={styles.accountMemberSince}>
              Member since {memberSince}
            </ThemedText>
          )}
        </View>

        <BaseCard
          onPress={handleSignOut}
          style={styles.signOutAction}
          shadowSize="none"
          includePressAnimation={true}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
        </BaseCard>
      </View>
    </View>
  );
});
AccountHeader.displayName = 'AccountHeader';

const AccountScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermissions, setNotificationPermissions] = useState(false);

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
          'Please allow notifications to receive study reminders.',
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
        {/* Account Header */}
        <View style={styles.accountHeaderWrapper}>
          <BaseCard
            style={styles.accountHeaderCard}
            shadowSize="small"
            includePressAnimation={false}
          >
            <AccountHeader />
          </BaseCard>
        </View>

        {/* Appearance Section */}
        <View style={styles.appearanceWrapper}>
          <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
            Appearance
          </ThemedText>
          <BaseCard
            style={styles.appearanceContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.appearanceLinksContainer}>
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
            </View>
          </BaseCard>
        </View>

        {/* Reminders Section */}
        <View style={styles.remindersWrapper}>
          <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
            Reminders
          </ThemedText>
          <BaseCard
            style={styles.remindersContainer}
            shadowSize="small"
            includePressAnimation={false}
          >
            <View style={styles.remindersLinksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel icon="notifications" text="Study Reminders" iconColor={colors.icon} />
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
                      <SettingLabel icon="time" text="Reminder Time" iconColor={colors.icon} />
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

        {/* Information Section */}
        <View style={styles.infoWrapper}>
          <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
            Information
          </ThemedText>
          <BaseCard style={styles.infoContainer} shadowSize="small" includePressAnimation={false}>
            <View style={styles.actionLinksContainer}>
              <BaseCard
                onPress={() => router.push('/about')}
                style={styles.actionLinkCard}
                shadowSize="none"
                includePressAnimation={true}
              >
                <View style={styles.actionLinkContent}>
                  <View style={styles.actionLinkLeft}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="information-circle" size={22} color={colors.icon} />
                    </View>
                    <ThemedText type="body" weight="medium" style={styles.actionLinkText}>
                      About
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

        {/* Connect Section */}
        <View style={styles.connectWrapper}>
          <ThemedText type="heading3" weight="bold" style={styles.sectionTitle}>
            Connect
          </ThemedText>
          <BaseCard
            style={styles.connectContainer}
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
                      <Ionicons name="logo-twitter" size={22} color={colors.socialTwitter} />
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
                      <Ionicons name="logo-facebook" size={22} color={colors.socialFacebook} />
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
                      <Ionicons name="logo-instagram" size={22} color={colors.socialInstagram} />
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

        {/* App Footer */}
        <View style={styles.appFooterWrapper}>
          <ThemedText type="caption" variant="secondary" style={styles.versionText}>
            Version {Constants.expoConfig?.version || appVersion || '1446.0.0'}
          </ThemedText>
          <ThemedText type="caption" variant="subtle" style={styles.copyrightText}>
            © 2024 OpenArabic. All rights reserved.
          </ThemedText>
        </View>
      </ThemedView>

      {/* Time Picker Modal */}
      <TimePicker
        isVisible={showTimePicker}
        onClose={handleTimePickerClose}
        onTimeSet={handleTimeSet}
        initialHour={reminderTime.hour}
        initialMinute={reminderTime.minute}
        title="Set Study Reminder"
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
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  scrollView: {
    flex: 1,
  },

  // Account Header Styles
  accountHeader: {
    padding: LAYOUT.SPACING.MEDIUM + 2,
  },
  accountHeaderWrapper: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  accountHeaderCard: {
    overflow: 'hidden',
  },
  accountProfileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  accountUserInfo: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.SMALL + 2,
    paddingTop: LAYOUT.SPACING.TINY,
    justifyContent: 'center',
  },
  accountUserName: {
    marginBottom: LAYOUT.SPACING.XTINY,
  },
  accountUserEmail: {
    marginBottom: LAYOUT.SPACING.XTINY,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  accountMemberSince: {
    marginTop: LAYOUT.SPACING.MICRO,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  signOutAction: {
    padding: LAYOUT.SPACING.SMALL + 2,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },

  // User initials badge styles
  userInitialsBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  userInitialsBadgeText: {
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '700',
  },

  // Section Styles
  sectionTitle: {
    marginBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },

  // Preferences Styles
  appearanceWrapper: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  appearanceContainer: {
    overflow: 'hidden',
  },

  // Setting Row Styles
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  // Information Section Styles
  infoWrapper: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  infoContainer: {
    overflow: 'hidden',
  },

  // Action Links Styles
  actionLinksContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  actionLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    paddingVertical: LAYOUT.SPACING.SMALL + 2,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    marginBottom: 0,
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

  // Connect Styles
  connectContainer: {
    overflow: 'hidden',
  },
  connectWrapper: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },

  // Social Links Styles
  socialLinksContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  socialLinkCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    paddingVertical: LAYOUT.SPACING.SMALL + 2,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    marginBottom: 0,
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

  // Reminders Styles
  remindersWrapper: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  remindersContainer: {
    overflow: 'hidden',
  },

  // Time Picker Styles
  timePickerSettingRow: {
    borderRadius: LAYOUT.BORDER_RADIUS.NONE,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
  },

  // Appearance Links Styles
  appearanceLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Reminders Links Styles
  remindersLinksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // App Footer Styles
  appFooterWrapper: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.XLARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  appName: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  versionText: {
    marginBottom: LAYOUT.SPACING.TINY,
    letterSpacing: 0.3,
  },
  copyrightText: {
    letterSpacing: 0.2,
  },
});

export default AccountScreen;
