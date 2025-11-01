// External Libraries
import { BaseCard } from '@common/BaseCard';
import { SectionTitle } from '@common/SectionTitle';
import { Ionicons } from '@expo/vector-icons';
import { TimePicker } from '@ui/TimePicker';
import { Toggle } from '@ui/Toggle';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { Fragment, memo, useCallback, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME_OPTIONS } from '@/components/ThemePicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AccountBadge, SocialMediaIcons } from '@/components/account';
import { AudioShuffleToggle } from '@/components/account/AudioShuffleToggle';
import { SettingsPicker } from '@/components/ui/SettingsPicker';
import type { Theme } from '@/constants/colors';
import { LAYOUT, MIN_TOUCH_TARGET, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAccountScreen } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import pkg from '@/package.json';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  setAudioLanguagePreference,
  setDailyWordLimit,
  setDisplayLanguagePreference,
  type AudioLanguagePreference,
  type DisplayLanguagePreference,
} from '@/store/settingsSlice';
import { setTheme } from '@/store/themeSlice';
import {
  AccountSection,
  AudioLanguage,
  DailyWordLimitDescription,
  DailyWordLimitTier,
  DisplayLanguage,
} from '@/types/enums';
import { formatBytes } from '@/utils/cacheUtils';

// Memoized components
const Divider = memo(() => {
  const colors = useColors();
  return <View style={[styles.commonDivider, { backgroundColor: colors.cardBorder }]} />;
});
Divider.displayName = 'Divider';

// DRY CardRight component for consistent right-side alignment
const CardRight = memo(
  ({
    type,
    text,
    toggleValue,
    onToggleChange,
  }: {
    type: 'chevron-only' | 'text-chevron' | 'toggle';
    text?: string;
    toggleValue?: boolean;
    onToggleChange?: (value: boolean) => void;
  }) => {
    const colors = useColors();

    if (type === 'toggle' && onToggleChange) {
      return <Toggle value={toggleValue || false} onValueChange={onToggleChange} />;
    }

    if (type === 'text-chevron') {
      return (
        <View style={styles.cardRightValue}>
          <ThemedText type="body" colorName="secondaryMetadataText">
            {text}
          </ThemedText>
          <Ionicons
            color={colors.secondaryMetadataText}
            name="chevron-forward"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          />
        </View>
      );
    }

    // Default: chevron-only
    return (
      <Ionicons
        color={colors.secondaryMetadataText}
        name="chevron-forward"
        size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
        style={styles.cardRightChevron}
      />
    );
  },
);
CardRight.displayName = 'CardRight';

const AccountScreen: FC = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Get theme with validation
  const rawTheme = useAppSelectorShallow(state => state.theme.theme);
  const currentTheme = useMemo(() => rawTheme ?? ('dark' as const), [rawTheme]);

  // Get language preferences from Redux with validation
  const rawLanguagePreference = useAppSelectorShallow(
    state => state.settings.displayLanguagePreference,
  );
  const rawAudioLanguagePreference = useAppSelectorShallow(
    state => state.settings.audioLanguagePreference,
  );

  // Validate and provide defaults - ensure values are valid enum values
  const currentLanguage = useMemo(() => {
    if (
      rawLanguagePreference === DisplayLanguage.ARABIC_ONLY ||
      rawLanguagePreference === DisplayLanguage.ARABIC_ENGLISH
    ) {
      return rawLanguagePreference;
    }
    return DisplayLanguage.ARABIC_ENGLISH; // Default
  }, [rawLanguagePreference]);

  const currentAudioLanguage = useMemo(() => {
    if (
      rawAudioLanguagePreference === AudioLanguage.ARABIC_ONLY ||
      rawAudioLanguagePreference === AudioLanguage.ENGLISH_ARABIC
    ) {
      return rawAudioLanguagePreference;
    }
    return AudioLanguage.ENGLISH_ARABIC; // Default
  }, [rawAudioLanguagePreference]);

  const currentArabicFont = useAppSelectorShallow(state => state.settings.arabicFont);
  const dispatch = useAppDispatch();

  const [activePicker, setActivePicker] = React.useState<string | null>(null);

  // Get daily word limit with validation
  const rawDailyWordLimit = useAppSelectorShallow(state => state.settings.dailyWordLimit);
  const currentDailyWordLimit = useMemo(() => {
    // Validate: must be a number (0, 10, 20, or 30)
    if (typeof rawDailyWordLimit === 'number' && rawDailyWordLimit >= 0) {
      return rawDailyWordLimit;
    }
    return 10; // Default to 10 words
  }, [rawDailyWordLimit]);

  const {
    reminderTime,
    formatReminderTime,
    showTimePicker,
    handleTimePickerOpen,
    handleTimePickerClose,
    handleTimeSet,
    handleReminderToggle,
    handleSignOut,
    handleResetReadingProgress,
    handleSupportContact,
    handleRequestReview,
    appVersion,
    currentYear,
    user,
    handleClearCache,
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
    [colors.error],
  );

  // Unified picker handlers
  const handlePickerOpen = useCallback((pickerType: string) => {
    setActivePicker(pickerType);
  }, []);

  const handlePickerClose = useCallback(() => {
    setActivePicker(null);
  }, []);

  const handlePickerSelect = useCallback(
    (value: string | number) => {
      switch (activePicker) {
        case 'theme':
          dispatch(setTheme(value as Theme));
          break;
        case 'language':
          dispatch(setDisplayLanguagePreference(value as DisplayLanguagePreference));
          break;
        case 'audioLanguage':
          dispatch(setAudioLanguagePreference(value as AudioLanguagePreference));
          break;
        case 'dailyWordLimit':
          dispatch(setDailyWordLimit(value as number));
          break;
      }
      // Don't close picker on selection - let user close manually
    },
    [activePicker, dispatch],
  );

  // Picker configurations
  const pickerConfigs = useMemo(
    () => ({
      theme: {
        title: STRINGS.THEME,
        options: THEME_OPTIONS,
        selectedValue: currentTheme,
        snapPoints: [440],
      },
      language: {
        title: STRINGS.DISPLAY_LANGUAGE,
        options: [
          {
            id: DisplayLanguage.ARABIC_ONLY,
            title: STRINGS.DISPLAY_LANGUAGE_ARABIC,
            subtitle: 'Show only Arabic text in the Library tab. English translations are hidden.',
            icon: 'text' as const,
          },
          {
            id: DisplayLanguage.ARABIC_ENGLISH,
            title: STRINGS.DISPLAY_LANGUAGE_BILINGUAL,
            subtitle: 'Show Arabic text with English translations in the Library tab.',
            icon: 'language' as const,
          },
        ],
        selectedValue: currentLanguage,
        snapPoints: [320],
      },
      audioLanguage: {
        title: STRINGS.AUDIO_LANGUAGE,
        options: [
          {
            id: AudioLanguage.ARABIC_ONLY,
            title: STRINGS.AUDIO_LANGUAGE_ARABIC,
            subtitle:
              'Play only Arabic audio in the Bookmarks tab. English translations are skipped.',
            icon: 'volume-high' as const,
          },
          {
            id: AudioLanguage.ENGLISH_ARABIC,
            title: STRINGS.AUDIO_LANGUAGE_BILINGUAL,
            subtitle: 'Play English translation followed by Arabic audio in the Bookmarks tab.',
            icon: 'language' as const,
          },
        ],
        selectedValue: currentAudioLanguage,
        snapPoints: [320],
      },
      dailyWordLimit: {
        title: STRINGS.DAILY_WORD_LIMIT,
        options: [
          {
            id: 10,
            title: DailyWordLimitTier.GETTING_STARTED,
            subtitle: DailyWordLimitDescription.GETTING_STARTED,
            icon: 'school' as const,
          },
          {
            id: 20,
            title: DailyWordLimitTier.STEADY_PROGRESS,
            subtitle: DailyWordLimitDescription.STEADY_PROGRESS,
            icon: 'trending-up' as const,
          },
          {
            id: 30,
            title: DailyWordLimitTier.ACTIVE_LEARNING,
            subtitle: DailyWordLimitDescription.ACTIVE_LEARNING,
            icon: 'flash' as const,
          },
          {
            id: 0,
            title: DailyWordLimitTier.UNLIMITED,
            subtitle: DailyWordLimitDescription.UNLIMITED,
            icon: 'infinite' as const,
          },
        ],
        selectedValue: currentDailyWordLimit,
        snapPoints: [520],
      },
    }),
    [currentTheme, currentLanguage, currentAudioLanguage, currentDailyWordLimit],
  );

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

  // Get current Arabic font display text
  const currentArabicFontText = useMemo(() => {
    const fontDisplayNames: Record<string, string> = {
      'NotoSansArabic-Regular': 'Noto Sans',
      DigitalKhattNewMadinaRegular: 'Madina',
      'Amiri-Regular': 'Amiri',
      'ScheherazadeNew-Regular': 'Scheherazade',
      'NotoNastaliqUrdu-Regular': 'Nastaliq',
    };
    return fontDisplayNames[currentArabicFont] || 'Noto Sans';
  }, [currentArabicFont]);

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
          showsVerticalScrollIndicator: true,
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

        {/* Appearance - All visual customization together */}
        <SectionTitle title={STRINGS.APPEARANCE_SECTION} textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={() => handlePickerOpen('theme')}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="color-palette"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.THEME}
                  </ThemedText>
                </View>
                <CardRight type="text-chevron" text={currentThemeText} />
              </View>
            </BaseCard>

            <Divider />

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
                <CardRight type="text-chevron" text={currentArabicFontText} />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={() => handlePickerOpen('language')}
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
                <CardRight type="text-chevron" text={currentLanguageText} />
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Audio & Playback - Audio settings */}
        <SectionTitle title={AccountSection.AUDIO_PLAYBACK} textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={() => handlePickerOpen('audioLanguage')}
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
                <CardRight type="text-chevron" text={currentAudioLanguageText} />
              </View>
            </BaseCard>

            <Divider />

            <BaseCard shadowSize="none" style={styles.interactiveCard}>
              <AudioShuffleToggle />
            </BaseCard>
          </View>
        </BaseCard>

        {/* Learning - Study settings */}
        <SectionTitle title={AccountSection.LEARNING} textStyle={styles.sectionTitle} />
        <BaseCard shadowSize="small" style={styles.sectionContainer}>
          <View style={styles.linksContainer}>
            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={() => handlePickerOpen('dailyWordLimit')}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="book"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.DAILY_WORD_LIMIT}
                  </ThemedText>
                </View>
                <CardRight type="text-chevron" text={currentDailyWordLimitText} />
              </View>
            </BaseCard>

            <Divider />

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
              <CardRight
                type="toggle"
                toggleValue={reminderTime.enabled}
                onToggleChange={handleReminderToggle}
              />
            </View>
            {reminderTime.enabled && (
              <Fragment>
                <Divider />
                <BaseCard
                  shadowSize="none"
                  style={styles.interactiveCard}
                  onPress={handleTimePickerOpen}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardLeft}>
                      <View style={styles.cardIconContainer}>
                        <Ionicons
                          color={colors.interactiveSecondary}
                          name="time"
                          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                        />
                      </View>
                      <ThemedText style={styles.cardText} type="body" weight="medium">
                        {STRINGS.TIME}
                      </ThemedText>
                    </View>
                    <CardRight
                      type="text-chevron"
                      text={formatReminderTime(reminderTime.hour, reminderTime.minute)}
                    />
                  </View>
                </BaseCard>
              </Fragment>
            )}
          </View>
        </BaseCard>

        {/* Support - Help and assistance */}
        <SectionTitle title={AccountSection.HELP_SUPPORT} textStyle={styles.sectionTitle} />
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
                <CardRight type="chevron-only" />
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
                <CardRight type="chevron-only" />
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
                <CardRight type="chevron-only" />
              </View>
            </BaseCard>
          </View>
        </BaseCard>

        {/* Data & Account - Account management and data */}
        <SectionTitle title={STRINGS.DATA_ACCOUNT_SECTION} textStyle={styles.sectionTitle} />
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
              </View>
            </BaseCard>

            <Divider />

            <BaseCard
              shadowSize="none"
              style={styles.interactiveCard}
              onPress={handleResetReadingProgress}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons
                      color={colors.interactiveSecondary}
                      name="refresh"
                      size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                    />
                  </View>
                  <ThemedText style={styles.cardText} type="body" weight="medium">
                    {STRINGS.RESET_READING_PROGRESS}
                  </ThemedText>
                </View>
                <ThemedText
                  type="label"
                  weight="medium"
                  colorName="tint"
                  style={styles.clearButton}
                  onPress={handleResetReadingProgress}
                >
                  RESET
                </ThemedText>
              </View>
            </BaseCard>

            <Divider />

            <BaseCard shadowSize="none" style={styles.interactiveCard} onPress={handleSignOut}>
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
                    <ThemedText type="body" weight="medium" style={signOutTextStyle}>
                      {STRINGS.SIGN_OUT}
                    </ThemedText>
                    <ThemedText type="caption" colorName="error" style={styles.userEmailText}>
                      {user?.email || STRINGS.NO_EMAIL}
                    </ThemedText>
                  </View>
                </View>
                <CardRight type="chevron-only" />
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

      {/* Unified SettingsPicker Modal - Controlled Mode */}
      <SettingsPicker
        isVisible={activePicker !== null}
        onClose={handlePickerClose}
        onSelect={handlePickerSelect}
        title={activePicker ? pickerConfigs[activePicker as keyof typeof pickerConfigs].title : ''}
        options={
          activePicker ? pickerConfigs[activePicker as keyof typeof pickerConfigs].options : []
        }
        selectedValue={
          activePicker
            ? pickerConfigs[activePicker as keyof typeof pickerConfigs].selectedValue
            : undefined
        }
        snapPoints={
          activePicker
            ? pickerConfigs[activePicker as keyof typeof pickerConfigs].snapPoints
            : [320]
        }
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

  cardRightValue: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
  },
  cardRightChevron: {
    minWidth: LAYOUT.SPACING.XLARGE,
    textAlign: 'center',
  },

  // App Footer Styles
  appFooterWrapper: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    marginTop: LAYOUT.SPACING.SMALL,
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
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  scrollView: {
    flex: 1,
  },

  signOutTextContainer: {
    flexDirection: 'column',
    marginLeft: LAYOUT.SPACING.MEDIUM, // Increased from SMALL for consistency
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
    marginBottom: LAYOUT.SPACING.TINY,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    opacity: LAYOUT.OPACITY.HIGH,
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

export default AccountScreen;
