// External Libraries
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import SectionTitle from '@/components/SectionTitle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TimePicker } from '@/components/TimePicker';
import { Toggle } from '@/components/Toggle';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useAccountScreen } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import pkg from '@/package.json';
import { formatBytes } from '@/utils/cacheUtils';

// Memoized components
interface SettingLabelProps {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
  readonly iconColor?: string;
}

const SettingLabel = memo(({ icon, text, iconColor }: SettingLabelProps) => {
  const colors = useColors();
  const defaultIconColor = iconColor || colors.secondaryText;

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

const AccountScreen: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
    appVersion,
    currentYear,
    user,
    handleClearCache,
    isClearingCache,
    cacheSize,
  } = useAccountScreen();

  // Format cache size for display
  const formattedCacheSize = cacheSize > 0 ? formatBytes(cacheSize) : 'No cached files';

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
            paddingTop: LAYOUT.SPACING.LARGE, // Reduced padding for tighter layout
            paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
          },
        ]}
        scrollViewProps={{
          style: styles.scrollView,
          showsVerticalScrollIndicator: false,
        }}
      >
        {/* Notifications Section - Moved to top as most frequently used */}
        <View style={styles.firstSectionOverride}>
          <SectionTitle isFirstSection={true} title="Notifications" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.linksContainer}>
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
        <View>
          <SectionTitle title="Appearance" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.linksContainer}>
              <View style={styles.settingRow}>
                <SettingLabel icon="moon" iconColor={colors.icon} text="Dark Mode" />
                <ThemeToggle />
              </View>
            </View>
          </BaseCard>
        </View>

        {/* Science Section - Educational content, valuable for understanding */}
        <View>
          <SectionTitle title="Science" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
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
                      <Ionicons color={colors.icon} name="school-outline" size={22} />
                    </View>
                    <ThemedText style={styles.cardText} type="body" weight="medium">
                      Language Learning Science
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="chevron-forward-outline"
                    size={20}
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
                      <Ionicons color={colors.icon} name="library-outline" size={22} />
                    </View>
                    <ThemedText style={styles.cardText} type="body" weight="medium">
                      Why Classical Texts
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="chevron-forward-outline"
                    size={20}
                    style={styles.cardChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Connect Section - Social links, less frequently used */}
        <View>
          <SectionTitle title="Connect" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
          >
            <View style={styles.linksContainer}>
              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.interactiveCard}
                onPress={() => handleSocialLink('https://twitter.com/OpenArabicIo')}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons color={colors.icon} name="logo-twitter" size={22} />
                    </View>
                    <ThemedText style={styles.cardText} type="body" weight="medium">
                      Twitter
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.cardChevron}
                  />
                </View>
              </BaseCard>

              <Divider />

              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.interactiveCard}
                onPress={() => handleSocialLink('https://www.facebook.com/OpenArabic.io/')}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons color={colors.icon} name="logo-facebook" size={22} />
                    </View>
                    <ThemedText style={styles.cardText} type="body" weight="medium">
                      Facebook
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.cardChevron}
                  />
                </View>
              </BaseCard>

              <Divider />

              <BaseCard
                includePressAnimation={true}
                shadowSize="none"
                style={styles.interactiveCard}
                onPress={() => handleSocialLink('https://www.instagram.com/openarabic.io/')}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIconContainer}>
                      <Ionicons color={colors.icon} name="logo-instagram" size={22} />
                    </View>
                    <ThemedText style={styles.cardText} type="body" weight="medium">
                      Instagram
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
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
                      <Ionicons color={colors.icon} name="mail" size={22} />
                    </View>
                    <ThemedText style={styles.cardText} type="body" weight="medium">
                      Email
                    </ThemedText>
                  </View>
                  <Ionicons
                    color={colors.textTertiary}
                    name="open-outline"
                    size={16}
                    style={styles.cardChevron}
                  />
                </View>
              </BaseCard>
            </View>
          </BaseCard>
        </View>

        {/* Manage Section - Kept at bottom as destructive action */}
        <View>
          <SectionTitle title="Manage" />
          <BaseCard
            includePressAnimation={false}
            shadowSize="small"
            style={styles.sectionContainer}
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
                      <Ionicons color={colors.icon} name="folder-open-outline" size={22} />
                    </View>
                    <View style={styles.cacheTextContainer}>
                      <ThemedText type="body" weight="medium">
                        Audio Cache
                      </ThemedText>
                      <ThemedText
                        colorName="textTertiary"
                        style={styles.cacheSubtext}
                        type="caption"
                      >
                        {formattedCacheSize}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedButton
                    disabled={cacheSize === 0 || isClearingCache}
                    loading={isClearingCache}
                    size="small"
                    style={styles.clearButton}
                    title="Clear"
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
                      <Ionicons color={colors.error} name="log-out-outline" size={22} />
                    </View>
                    <View style={styles.signOutTextContainer}>
                      <ThemedText type="body" weight="medium">
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
                    style={styles.cardChevron}
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
              Version {Constants.expoConfig?.version || appVersion || '0.0.0'}
            </ThemedText>
            <ThemedText colorName="tabIconDefault" style={styles.copyrightText} type="caption">
              © {currentYear} {pkg.name}
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
    letterSpacing: 0.3,
    opacity: LAYOUT.OPACITY.MEDIUM,
  },

  flexOne: {
    flex: 1,
  },

  firstSectionOverride: {
    marginTop: -LAYOUT.SPACING.XLARGE, // Offset the SectionTitle's first section margin
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
    letterSpacing: 0.4,
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
    minWidth: 50,
    paddingHorizontal: LAYOUT.SPACING.TINY,
  },
});

export default AccountScreen;
