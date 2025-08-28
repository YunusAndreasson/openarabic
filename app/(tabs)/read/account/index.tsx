// External Libraries
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { Fragment, memo, useCallback, useMemo, type FC } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@common/BaseCard';
import SectionTitle from '@common/SectionTitle';
import { TimePicker } from '@ui/TimePicker';
import { Toggle } from '@ui/Toggle';

import { THEME_OPTIONS, ThemePicker } from '@/components/ThemePicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AccountBadge, SocialMediaIcons } from '@/components/account';
import { AudioLanguagePicker } from '@/components/account/AudioLanguagePicker';
import AudioShuffleToggle from '@/components/account/AudioShuffleToggle';
import { DailyWordLimitPicker } from '@/components/account/DailyWordLimitPicker';
import { LanguagePicker } from '@/components/account/LanguagePicker';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
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
  const currentLanguage = useAppSelectorMemo(state => state.settings.displayLanguagePreference);
  const currentAudioLanguage = useAppSelectorMemo(state => state.settings.audioLanguagePreference);
  const [showThemePicker, setShowThemePicker] = React.useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = React.useState(false);
  const [showAudioLanguagePicker, setShowAudioLanguagePicker] = React.useState(false);
  const [showDailyWordLimitPicker, setShowDailyWordLimitPicker] = React.useState(false);
  const currentDailyWordLimit = useAppSelectorMemo(state => state.settings.dailyWordLimit);

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
    handleRequestReview,
    appVersion,
    currentYear,
    user,
    handleClearCache,
    isClearingCache,
    cacheSize,
  } = useAccountScreen();

  const currentDailyWordLimitText = useMemo(() => {
    if (currentDailyWordLimit === undefined || currentDailyWordLimit === null) {
      return '10 words'; // Default fallback
    }
    if (currentDailyWordLimit === 0) return 'Unlimited';
    return `${currentDailyWordLimit} words`;
  }, [currentDailyWordLimit]);

  // Memoize dynamic styles for better performance
  const signOutTextStyle = useMemo(
    () => ({
      color: colors.error,
    }),
    [colors.error]
  );

  // Theme picker handlers
  const handleThemePickerOpen = useCallback(() => {
    setShowThemePicker(true);
  }, []);

  const handleThemePickerClose = useCallback(() => {
    setShowThemePicker(false);
  }, []);

  // Language picker handlers
  const handleLanguagePickerOpen = useCallback(() => {
    setShowLanguagePicker(true);
  }, []);

  const handleLanguagePickerClose = useCallback(() => {
    setShowLanguagePicker(false);
  }, []);

  // Audio language picker handlers
  const handleAudioLanguagePickerOpen = useCallback(() => {
    setShowAudioLanguagePicker(true);
  }, []);

  const handleAudioLanguagePickerClose = useCallback(() => {
    setShowAudioLanguagePicker(false);
  }, []);

  // Daily word limit picker handlers
  const handleDailyWordLimitPickerOpen = useCallback(() => {
    setShowDailyWordLimitPicker(true);
  }, []);

  const handleDailyWordLimitPickerClose = useCallback(() => {
    setShowDailyWordLimitPicker(false);
  }, []);

  // Get current theme display text
  const currentThemeText = useMemo(() => {
    const themeOption = THEME_OPTIONS.find(option => option.id === currentTheme);
    return themeOption?.title || STRINGS.THEME_BIRCHES;
  }, [currentTheme]);

  // Get current language display text
  const currentLanguageText =
    currentLanguage === 'arabic'
      ? STRINGS.DISPLAY_LANGUAGE_ARABIC
      : STRINGS.DISPLAY_LANGUAGE_BILINGUAL;

  // Get current audio language display text
  const currentAudioLanguageText =
    currentAudioLanguage === 'arabic'
      ? STRINGS.AUDIO_LANGUAGE_ARABIC
      : STRINGS.AUDIO_LANGUAGE_BILINGUAL;

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
            paddingTop: LAYOUT.SPACING.XLARGE, // Restore normal top padding
            paddingBottom: insets.bottom + LAYOUT.SPACING.MEDIUM, // Reduced from LARGE to fix excessive padding
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Account Badge - Premium header section */}
        {user && (
          <AccountBadge
            userEmail={user.email || 'user@example.com'}
            userId={user.id}
            createdAt={user.created_at}
          />
        )}

        {/* Reading - Font and language settings */}
        <SectionTitle title="Reading" textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={() => router.push(ROUTE_PATHS.ACCOUNT_FONT_SELECTOR)}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
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
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleLanguagePickerOpen}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="language"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.DISPLAY_LANGUAGE}
                  </ThemedText>
                </View>
                <View style={styles.settingValueContainer}>
                  <ThemedText type="body" colorName="metadataText">
                    {currentLanguageText}
                  </ThemedText>
                  <Ionicons
                    color={colors.metadataText}
                    name="chevron-forward"
                    size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  />
                </View>
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Audio - Audio preferences and playlist settings */}
        <SectionTitle title="Audio" textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleAudioLanguagePickerOpen}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="volume-high"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.AUDIO_LANGUAGE}
                  </ThemedText>
                </View>
                <View style={styles.settingValueContainer}>
                  <ThemedText type="body" colorName="metadataText">
                    {currentAudioLanguageText}
                  </ThemedText>
                  <Ionicons
                    color={colors.metadataText}
                    name="chevron-forward"
                    size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  />
                </View>
              </View>
            </BaseCard>

            <Divider />

            <BaseCard shadowSize="none" style={styles.interactiveCard}>
              <AudioShuffleToggle />
            </BaseCard>
          </View>
        </BaseCard>

        {/* Study - Study reminders and timing */}
        <SectionTitle title="Study" textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <View style={styles.cardIconContainer}>
                  <Ionicons
                    color={colors.interactiveSecondary}
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
                  shadowSize="none"
                  style={styles.timePickerSettingRow}
                  onPress={handleTimePickerOpen}
                >
                  <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                      <View style={styles.cardIconContainer}>
                        <Ionicons
                          color={colors.interactiveSecondary}
                          name="time"
                          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                        />
                      </View>
                      <View style={styles.settingLabelTextContainer}>
                        <ThemedText type="body">{STRINGS.TIME}</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="body" colorName="metadataText">
                      {formatReminderTime(reminderTime.hour, reminderTime.minute)}
                    </ThemedText>
                  </View>
                </BaseCard>
              </Fragment>
            )}

            <Divider />

            <BaseCard
              shadowSize="none"
              style={styles.timePickerSettingRow}
              onPress={handleDailyWordLimitPickerOpen}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="book"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">{STRINGS.DAILY_WORD_LIMIT}</ThemedText>
                  </View>
                </View>
                <View style={styles.settingValueContainer}>
                  <ThemedText type="body" colorName="metadataText">
                    {currentDailyWordLimitText}
                  </ThemedText>
                  <Ionicons
                    color={colors.metadataText}
                    name="chevron-forward"
                    size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  />
                </View>
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Appearance - Theme and visual settings */}
        <SectionTitle title="Appearance" textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.timePickerSettingRow}
              onPress={handleThemePickerOpen}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="color-palette"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.settingLabelTextContainer}>
                    <ThemedText type="body">{STRINGS.THEME}</ThemedText>
                  </View>
                </View>
                <View style={styles.settingValueContainer}>
                  <ThemedText type="body" colorName="metadataText">
                    {currentThemeText}
                  </ThemedText>
                  <Ionicons
                    color={colors.metadataText}
                    name="chevron-forward"
                    size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  />
                </View>
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Support - Help and assistance */}
        <SectionTitle title="Support" textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={() => router.push(ROUTE_PATHS.ACCOUNT_HELP)}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="help-circle"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.HELP}
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
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleSupportContact}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
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

            <Divider />

            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleRequestReview}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="star"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.RATE_APP}
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

        {/* Account - Data and account actions */}
        <SectionTitle title="Account" textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard shadowSize="none" style={styles.interactiveCard} onPress={handleClearCache}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="folder"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.cacheTextContainer}>
                    <ThemedText type="body" weight="medium">
                      {STRINGS.CLEAR_CACHE}
                    </ThemedText>
                    <ThemedText colorName="textTertiary" style={styles.cacheSubtext} type="caption">
                      {formattedCacheSize}
                    </ThemedText>
                  </View>
                </View>
                {isClearingCache ? (
                  <View style={styles.clearButton}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                ) : (
                  <ThemedText
                    type="label"
                    weight="medium"
                    colorName="tint"
                    style={styles.clearButton}
                    onPress={cacheSize > 0 ? handleClearCache : undefined}
                    disabled={cacheSize === 0}
                  >
                    CLEAR
                  </ThemedText>
                )}
              </View>
            </BaseCard>

            <Divider />

            <BaseCard shadowSize="none" style={styles.interactiveCard} onPress={handleSignOut}>
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="log-out"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.signOutTextContainer}>
                    <ThemedText type="body" weight="medium" style={signOutTextStyle}>
                      {STRINGS.SIGN_OUT}
                    </ThemedText>
                    <ThemedText type="caption" colorName="error" style={styles.userEmailText}>
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

        {/* App Footer */}
        <View style={styles.appFooterWrapper}>
          <View style={styles.appFooterContent}>
            <ThemedText colorName="captionText" style={styles.versionText} type="caption">
              {STRINGS.APP_VERSION_LABEL} {Constants.expoConfig?.version || appVersion || '0.0.0'}
            </ThemedText>
            <ThemedText colorName="captionText" style={styles.copyrightText} type="caption">
              {STRINGS.COPYRIGHT_SYMBOL} {currentYear} {pkg.name}
            </ThemedText>
            <SocialMediaIcons />
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

      {/* Language Picker Modal */}
      <LanguagePicker isVisible={showLanguagePicker} onClose={handleLanguagePickerClose} />

      {/* Audio Language Picker Modal */}
      <AudioLanguagePicker
        isVisible={showAudioLanguagePicker}
        onClose={handleAudioLanguagePickerClose}
      />

      {/* Daily Word Limit Picker Modal */}
      <DailyWordLimitPicker
        key={showDailyWordLimitPicker ? 'open' : 'closed'}
        isVisible={showDailyWordLimitPicker}
        onClose={handleDailyWordLimitPickerClose}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  // Common Section Container Styles
  sectionContainer: {
    overflow: 'hidden',
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
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  cardText: {
    marginLeft: LAYOUT.SPACING.MEDIUM, // Increased from SMALL for better visual balance
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
    marginTop: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  appFooterContent: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
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
    marginLeft: LAYOUT.SPACING.MEDIUM, // Increased from SMALL for consistency with cardText
  },
  settingValueContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
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
    marginLeft: LAYOUT.SPACING.MEDIUM, // Increased from SMALL for consistency
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
    marginLeft: LAYOUT.SPACING.MEDIUM, // Increased from SMALL for consistency
  },

  cacheSubtext: {
    marginTop: LAYOUT.SPACING.TINY,
  },

  clearButton: {
    minWidth: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },

  // Section Title Styles
  sectionTitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    opacity: LAYOUT.OPACITY.HIGH,
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

export default AccountScreen;
