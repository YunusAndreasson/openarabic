// External Libraries
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { Fragment, memo, useCallback, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@common/BaseCard';
import { TimePicker } from '@ui/TimePicker';
import { Toggle } from '@ui/Toggle';

import { THEME_OPTIONS, ThemePicker } from '@/components/ThemePicker';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AccountBadge } from '@/components/account';
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
    handleFontSelectorPress,
    appVersion,
    currentYear,
    user,
    handleClearCache,
    isClearingCache,
    cacheSize,
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
            paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Account Badge - Premium header section */}
        {user && <AccountBadge userEmail={user.email || 'user@example.com'} userId={user.id} />}

        {/* App Preferences - Core settings users adjust frequently */}
        <BaseCard includePressAnimation={false} shadowSize="small" style={styles.sectionContainer}>
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
                  includePressAnimation={true}
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
                    <ThemedText type="body" variant="secondary">
                      {formatReminderTime(reminderTime.hour, reminderTime.minute)}
                    </ThemedText>
                  </View>
                </BaseCard>
              </Fragment>
            )}

            <Divider />

            <BaseCard
              includePressAnimation={true}
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
                  <ThemedText type="body" variant="secondary">
                    {currentThemeText}
                  </ThemedText>
                  <Ionicons
                    color={colors.textTertiary}
                    name="chevron-forward"
                    size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  />
                </View>
              </View>
            </BaseCard>

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
          </View>
        </BaseCard>

        {/* Help & Support - Assistance and contact */}
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
              includePressAnimation={true}
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
          </View>
        </BaseCard>

        {/* Account Management - Data and account actions */}
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
                      color={colors.interactiveSecondary}
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
                      color={colors.error}
                      name="log-out"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <View style={styles.signOutTextContainer}>
                    <ThemedText type="body" weight="medium" style={{ color: colors.error }}>
                      {STRINGS.SIGN_OUT}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      colorName="metadataText"
                      style={styles.userEmailText}
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

        {/* App Footer */}
        <View style={styles.appFooterWrapper}>
          <View style={styles.appFooterContent}>
            <ThemedText colorName="captionText" style={styles.versionText} type="caption">
              {STRINGS.APP_VERSION_LABEL} {Constants.expoConfig?.version || appVersion || '0.0.0'}
            </ThemedText>
            <ThemedText colorName="captionText" style={styles.copyrightText} type="caption">
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
    marginLeft: LAYOUT.SPACING.SMALL,
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
    maxWidth: MIN_TOUCH_TARGET.LARGE * 2,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
});

export default AccountScreen;
