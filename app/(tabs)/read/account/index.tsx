// External Libraries
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { Fragment, memo, useCallback, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { THEME_OPTIONS, ThemePicker } from '@/components/ThemePicker';
import ThemeSelector from '@/components/ThemeSelector';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TimePicker } from '@/components/TimePicker';
import { Toggle } from '@/components/Toggle';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAccountScreen } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import pkg from '@/package.json';
import { useAppSelectorMemo } from '@/store/hooks';
import { formatBytes } from '@/utils/cacheUtils';

// Memoized components
const Divider = memo(() => {
  const colors = useColors();
  return <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />;
});
Divider.displayName = 'Divider';

const AccountScreen: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentTheme = useAppSelectorMemo(state => state.theme.theme);
  const [showThemePicker, setShowThemePicker] = React.useState(false);

  const {
    reminderTime,
    formatReminderTime,
    showTimePicker,
    handleTimePickerOpen,
    handleTimePickerClose,
    handleTimeSet,
    handleReminderToggle,
    handleSignOut,
    handleSupportContact,
    handleSocialLink,
    handleLearningMethodPress,
    handleClassicalTextsPress,
    handleFontSelectorPress,
    appVersion,
    currentYear,
    user,
    handleClearCache,
    isClearingCache,
    cacheSize,
    appIconBadgeEnabled,
    handleAppIconBadgeToggle,
  } = useAccountScreen();

  // Theme picker handlers
  const handleThemePickerOpen = useCallback(() => {
    setShowThemePicker(true);
  }, []);

  const handleThemePickerClose = useCallback(() => {
    setShowThemePicker(false);
  }, []);

  // Get current theme display text
  const currentThemeOption = THEME_OPTIONS.find(option => option.id === currentTheme);
  const currentThemeText = currentThemeOption?.title || 'Birches in Spring';

  const openTwitter = useCallback(() => {
    handleSocialLink('https://twitter.com/OpenArabicIo');
  }, [handleSocialLink]);

  const openFacebook = useCallback(() => {
    handleSocialLink('https://www.facebook.com/OpenArabic.io/');
  }, [handleSocialLink]);

  const openInstagram = useCallback(() => {
    handleSocialLink('https://www.instagram.com/openarabic.io/');
  }, [handleSocialLink]);

  // Format cache size for display
  const formattedCacheSize = cacheSize > 0 ? formatBytes(cacheSize) : STRINGS.NO_CACHED_FILES;

  return (
    <ThemedView
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
            paddingTop: LAYOUT.SPACING.XLARGE,
            paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Core Settings - Most frequently used */}
        <BaseCard includePressAnimation={false} shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <View style={styles.cardIconContainer}>
                  <Ionicons
                    color={colors.text}
                    name="notifications"
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  />
                </View>
                <View style={styles.settingLabelTextContainer}>
                  <ThemedText type="body">{STRINGS.STUDY_REMINDERS}</ThemedText>
                </View>
              </View>
              <Toggle value={reminderTime.enabled} onValueChange={handleReminderToggle} />
            </View>
            {reminderTime.enabled && (
              <Fragment>
                <Divider />
                <BaseCard
                  includePressAnimation={true}
                  shadowSize="none"
                  style={styles.timePickerSettingRow}
                  onPress={handleTimePickerOpen}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                      <View style={styles.cardIconContainer}>
                        <Ionicons
                          color={colors.text}
                          name="time"
                          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                        />
                      </View>
                      <View style={styles.settingLabelTextContainer}>
                        <ThemedText type="body">{STRINGS.TIME}</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="body" variant="secondary">
                      {formatReminderTime(reminderTime.hour, reminderTime.minute)}
                    </ThemedText>
                  </View>
                </BaseCard>
              </Fragment>
            )}

            <Divider />

            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <View style={styles.cardIconContainer}>
                  <Ionicons
                    color={colors.text}
                    name="color-palette"
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  />
                </View>
                <View style={styles.settingLabelTextContainer}>
                  <ThemedText type="body">Theme</ThemedText>
                </View>
              </View>
              <ThemeSelector currentThemeText={currentThemeText} onPress={handleThemePickerOpen} />
            </View>

            <Divider />

            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <View style={styles.cardIconContainer}>
                  <Ionicons
                    color={colors.text}
                    name="phone-portrait"
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  />
                </View>
                <View style={styles.settingLabelTextContainer}>
                  <ThemedText type="body">{STRINGS.APP_ICON_BADGE}</ThemedText>
                </View>
              </View>
              <Toggle value={appIconBadgeEnabled} onValueChange={handleAppIconBadgeToggle} />
            </View>

            <Divider />

            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleFontSelectorPress}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="text"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.ARABIC_FONT}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="chevron-forward"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleSupportContact}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="mail"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.CONTACT_SUPPORT}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="open"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Learning Resources - Educational content */}
        <BaseCard
          includePressAnimation={false}
          shadowSize="small"
          style={[styles.sectionContainer, styles.sectionSpacing]}
        >
          <View style={styles.linksContainer}>
            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleLearningMethodPress}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="school"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.LANGUAGE_LEARNING_SCIENCE}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="chevron-forward"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleClassicalTextsPress}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="library"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.WHY_CLASSICAL_TEXTS}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="chevron-forward"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Account Management - Important but less frequent */}
        <BaseCard
          includePressAnimation={false}
          shadowSize="small"
          style={[styles.sectionContainer, styles.sectionSpacing]}
        >
          <View style={styles.linksContainer}>
            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleClearCache}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="archive"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.cacheTextContainer}>
                    <ThemedText type="body" weight="medium">
                      {STRINGS.AUDIO_CACHE}
                    </ThemedText>
                    <ThemedText colorName="textTertiary" style={styles.cacheSubtext} type="caption">
                      {formattedCacheSize}
                    </ThemedText>
                  </View>
                </View>
                <ThemedButton
                  disabled={cacheSize === 0 || isClearingCache}
                  loading={isClearingCache}
                  size="small"
                  style={styles.clearButton}
                  title={STRINGS.CLEAR}
                  variant="outlined"
                  onPress={handleClearCache}
                />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleSignOut}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="log-out"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.signOutTextContainer}>
                    <ThemedText type="body" weight="medium">
                      {STRINGS.SIGN_OUT}
                    </ThemedText>
                    <ThemedText
                      colorName="textTertiary"
                      style={styles.userEmailText}
                      type="caption"
                    >
                      {user?.email || STRINGS.NO_EMAIL}
                    </ThemedText>
                  </View>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="chevron-forward"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Social Media - Least frequently used */}
        <BaseCard
          includePressAnimation={false}
          shadowSize="small"
          style={[styles.sectionContainer, styles.sectionSpacing]}
        >
          <View style={styles.linksContainer}>
            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={openTwitter}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="logo-twitter"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.TWITTER}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="open"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={openFacebook}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="logo-facebook"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.FACEBOOK}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="open"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              includePressAnimation={true}
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={openInstagram}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.text}
                      name="logo-instagram"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.INSTAGRAM}
                  </ThemedText>
                </View>
                <Ionicons
                  color={colors.textTertiary}
                  name="open"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  style={styles.cardChevron}
                />
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* App Footer */}
        <View style={styles.appFooterWrapper}>
          <View style={styles.appFooterContent}>
            <ThemedText colorName="tabIconDefault" style={styles.versionText} type="caption">
              {STRINGS.APP_VERSION_LABEL} {Constants.expoConfig?.version || appVersion || '0.0.0'}
            </ThemedText>
            <ThemedText colorName="tabIconDefault" style={styles.copyrightText} type="caption">
              {STRINGS.COPYRIGHT_SYMBOL} {currentYear} {pkg.name}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Time Picker Modal */}
      <TimePicker
        initialHour={reminderTime.hour}
        initialMinute={reminderTime.minute}
        isVisible={showTimePicker}
        onClose={handleTimePickerClose}
        onTimeSet={handleTimeSet}
      />

      {/* Theme Picker Modal */}
      <ThemePicker isVisible={showThemePicker} onClose={handleThemePickerClose} />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  // Common Section Container Styles
  sectionContainer: {
    overflow: 'hidden',
  },

  // Section spacing between cards
  sectionSpacing: {
    marginTop: LAYOUT.SPACING.LARGE,
  },

  // Common Links Container Styles - Unified
  linksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  // Unified Card Style - Used for all interactive cards
  interactiveCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },

  // Unified Card Content Layout
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  cardText: {
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  cardChevron: {
    marginRight: LAYOUT.SPACING.SMALL,
    minWidth: LAYOUT.SPACING.XLARGE,
    opacity: LAYOUT.OPACITY.MEDIUM,
    textAlign: 'center',
  },

  // App Footer Styles
  appFooterWrapper: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.XLARGE,
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
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
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

  copyrightText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
    opacity: LAYOUT.OPACITY.MEDIUM,
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

  signOutTextContainer: {
    flexDirection: 'column',
    marginLeft: LAYOUT.SPACING.SMALL,
  },

  // Time Picker Styles
  timePickerSettingRow: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NONE,
  },

  userEmailText: {
    marginTop: LAYOUT.SPACING.TINY,
  },

  versionText: {
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.EXTRA_WIDE,
    opacity: LAYOUT.OPACITY.HIGH,
  },

  cacheTextContainer: {
    flexDirection: 'column',
    marginLeft: LAYOUT.SPACING.SMALL,
  },

  cacheSubtext: {
    marginTop: LAYOUT.SPACING.TINY,
  },

  clearButton: {
    alignSelf: 'flex-end',
    minWidth: MIN_TOUCH_TARGET.LARGE + LAYOUT.SPACING.MICRO * 2,
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
});

export default AccountScreen;
