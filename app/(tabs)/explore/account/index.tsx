// External Libraries
import { TimePicker } from '@/components/ui';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME_OPTIONS } from '@/components/ui/ThemePicker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { AccountBadge, SettingsCard, SettingsSection } from '@/components/account';
import {
  AboutSection,
  AppearanceSection,
  DangerZoneSection,
  SocialMediaSection,
} from '@/components/account/settings';
import { BrandFooter } from '@/components/explore';
import { useTutorialContext } from '@/components/providers';
import { SettingsPicker } from '@/components/ui/SettingsPicker';
import type { Theme } from '@/constants/colors';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAccountScreen } from '@/hooks/account';
import { useDailyWordLimit } from '@/hooks/vocabulary';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  setAudioLanguagePreference,
  setAudioShuffleEnabled,
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
import { handleError } from '@/utils/errorHandling';
import { errorFeedback, selectionFeedback, successFeedback } from '@/utils/haptics';

// Helper function for enum validation
function validateEnumValue<T>(value: unknown, validValues: readonly T[], defaultValue: T): T {
  return validValues.includes(value as T) ? (value as T) : defaultValue;
}

// Type-safe picker state
type ActivePicker = 'theme' | 'language' | 'audioLanguage' | 'dailyWordLimit' | null;

const AccountScreen: FC = () => {
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
  const currentLanguage = useMemo(
    () =>
      validateEnumValue(
        rawLanguagePreference,
        [DisplayLanguage.ARABIC_ONLY, DisplayLanguage.ARABIC_ENGLISH] as const,
        DisplayLanguage.ARABIC_ENGLISH,
      ),
    [rawLanguagePreference],
  );

  const currentAudioLanguage = useMemo(
    () =>
      validateEnumValue(
        rawAudioLanguagePreference,
        [AudioLanguage.ARABIC_ONLY, AudioLanguage.ENGLISH_ARABIC] as const,
        AudioLanguage.ENGLISH_ARABIC,
      ),
    [rawAudioLanguagePreference],
  );

  const currentArabicFont = useAppSelectorShallow(state => state.settings.arabicFont);
  const audioShuffleEnabled = useAppSelectorShallow(state => state.settings.audioShuffleEnabled);
  const dispatch = useAppDispatch();

  const [activePicker, setActivePicker] = React.useState<ActivePicker>(null);

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
    user,
    handleClearCache,
    cacheSize,
  } = useAccountScreen();

  // Tutorial management
  const { resetAllTutorials } = useTutorialContext();

  // Daily word limit tracking
  const { getRemainingWords } = useDailyWordLimit();
  const [wordsRemainingToday, setWordsRemainingToday] = useState<number | null>(null);

  // Fetch remaining words on mount
  useEffect(() => {
    const fetchRemainingWords = async () => {
      const remaining = await getRemainingWords();
      setWordsRemainingToday(remaining === Infinity ? null : remaining);
    };
    fetchRemainingWords();
  }, [getRemainingWords]);

  const currentDailyWordLimitText = useMemo(() => {
    if (currentDailyWordLimit === undefined || currentDailyWordLimit === null) {
      return '10 words'; // Default fallback
    }
    if (currentDailyWordLimit === 0) return 'Unlimited';
    return `${currentDailyWordLimit} words`;
  }, [currentDailyWordLimit]);

  // Unified picker handlers
  const handlePickerOpen = useCallback((pickerType: Exclude<ActivePicker, null>) => {
    setActivePicker(pickerType);
  }, []);

  const handlePickerClose = useCallback(() => {
    setActivePicker(null);
  }, []);

  // Reset tutorials handler
  const handleResetTutorials = useCallback(async () => {
    Alert.alert(STRINGS.RESET_TUTORIALS_TITLE, STRINGS.RESET_TUTORIALS_MESSAGE, [
      { text: STRINGS.CANCEL, style: 'cancel' },
      {
        text: STRINGS.RESET,
        onPress: async () => {
          try {
            await resetAllTutorials();
            successFeedback();
          } catch (error) {
            errorFeedback();
            handleError(error as Error, {
              toastMessage: 'Failed to reset tutorials',
              analyticsEventName: 'Reset_Tutorials_Failed',
            });
          }
        },
      },
    ]);
  }, [resetAllTutorials]);

  // Audio Shuffle toggle handler
  const handleAudioShuffleToggle = useCallback(
    (enabled: boolean) => {
      selectionFeedback();
      dispatch(setAudioShuffleEnabled(enabled));
    },
    [dispatch],
  );

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
        footerNote: undefined,
      },
      language: {
        title: STRINGS.DISPLAY_LANGUAGE,
        options: [
          {
            id: DisplayLanguage.ARABIC_ONLY,
            title: STRINGS.DISPLAY_LANGUAGE_ARABIC,
            subtitle: STRINGS.DISPLAY_LANGUAGE_ARABIC_SUBTITLE,
            icon: 'text' as const,
          },
          {
            id: DisplayLanguage.ARABIC_ENGLISH,
            title: STRINGS.BILINGUAL_LABEL,
            subtitle: STRINGS.DISPLAY_LANGUAGE_BILINGUAL_SUBTITLE,
            icon: 'language' as const,
          },
        ],
        selectedValue: currentLanguage,
        snapPoints: [320],
        footerNote: undefined,
      },
      audioLanguage: {
        title: STRINGS.AUDIO_LANGUAGE,
        options: [
          {
            id: AudioLanguage.ARABIC_ONLY,
            title: STRINGS.AUDIO_LANGUAGE_ARABIC,
            subtitle: STRINGS.AUDIO_LANGUAGE_ARABIC_SUBTITLE,
            icon: 'volume-high' as const,
          },
          {
            id: AudioLanguage.ENGLISH_ARABIC,
            title: STRINGS.BILINGUAL_LABEL,
            subtitle: STRINGS.AUDIO_LANGUAGE_BILINGUAL_SUBTITLE,
            icon: 'language' as const,
          },
        ],
        selectedValue: currentAudioLanguage,
        snapPoints: [380],
        footerNote: STRINGS.AUDIO_LANGUAGE_LONG_PRESS_TIP,
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
        footerNote: undefined,
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
    currentLanguage === 'arabic' ? STRINGS.DISPLAY_LANGUAGE_ARABIC : STRINGS.BILINGUAL_LABEL;

  // Get current audio language display text
  const currentAudioLanguageText =
    currentAudioLanguage === 'arabic' ? STRINGS.AUDIO_LANGUAGE_ARABIC : STRINGS.BILINGUAL_LABEL;

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
            userEmail={user.email || STRINGS.NO_EMAIL}
            userId={user.id}
            createdAt={user.created_at}
          />
        )}

        {/* Appearance - All visual customization together */}
        <AppearanceSection
          currentThemeText={currentThemeText}
          currentLanguageText={currentLanguageText}
          currentArabicFontText={currentArabicFontText}
          onThemePress={() => handlePickerOpen('theme')}
          onLanguagePress={() => handlePickerOpen('language')}
        />

        {/* Audio & Playback - Audio settings */}
        <SettingsSection title={AccountSection.AUDIO_PLAYBACK}>
          <SettingsCard
            icon="volume-high"
            label={STRINGS.AUDIO_LANGUAGE}
            rightType="text-chevron"
            rightText={currentAudioLanguageText}
            onPress={() => handlePickerOpen('audioLanguage')}
          />
          <SettingsCard
            icon="shuffle"
            label={STRINGS.AUDIO_SHUFFLE}
            subtitle={STRINGS.AUDIO_SHUFFLE_DESCRIPTION}
            rightType="toggle"
            toggleValue={audioShuffleEnabled}
            onToggleChange={handleAudioShuffleToggle}
          />
        </SettingsSection>

        {/* Learning - Study settings */}
        <SettingsSection title={AccountSection.LEARNING}>
          <SettingsCard
            icon="book"
            label={STRINGS.DAILY_WORD_LIMIT}
            subtitle={
              wordsRemainingToday !== null
                ? STRINGS.WORDS_REMAINING_TODAY.replace('{count}', String(wordsRemainingToday))
                : undefined
            }
            rightType="text-chevron"
            rightText={currentDailyWordLimitText}
            onPress={() => handlePickerOpen('dailyWordLimit')}
          />
          <SettingsCard
            icon="notifications"
            label={STRINGS.STUDY_REMINDERS}
            rightType="toggle"
            toggleValue={reminderTime.enabled}
            onToggleChange={handleReminderToggle}
          />
          {reminderTime.enabled && (
            <SettingsCard
              icon="time"
              label={STRINGS.TIME}
              rightType="text-chevron"
              rightText={formatReminderTime(reminderTime.hour, reminderTime.minute)}
              onPress={handleTimePickerOpen}
            />
          )}
        </SettingsSection>

        {/* Support - Help and assistance */}
        <SettingsSection title={AccountSection.SUPPORT}>
          <SettingsCard
            icon="help-circle"
            label={STRINGS.HELP_CENTER}
            rightType="chevron"
            onPress={() => router.push(ROUTE_PATHS.ACCOUNT_HELP)}
          />
          <SettingsCard
            icon="school"
            label={STRINGS.RESET_TUTORIALS}
            rightType="chevron"
            onPress={handleResetTutorials}
          />
          <SettingsCard
            icon="mail"
            label={STRINGS.CONTACT_SUPPORT}
            rightType="chevron"
            onPress={handleSupportContact}
          />
          <SettingsCard
            icon="star"
            label={STRINGS.RATE_APP}
            rightType="chevron"
            onPress={handleRequestReview}
          />
        </SettingsSection>

        {/* About - Legal and informational */}
        <AboutSection />

        {/* Follow Us - Social media links */}
        <SocialMediaSection />

        {/* Storage & Account - Data management and session */}
        <SettingsSection title={STRINGS.STORAGE_ACCOUNT_SECTION}>
          <SettingsCard
            icon="archive-outline"
            label={STRINGS.CLEAR_CACHE}
            subtitle={formattedCacheSize}
            rightType="custom"
            rightComponent={
              <ThemedText
                type="label"
                weight="medium"
                colorName="tint"
                style={styles.clearButton}
                onPress={cacheSize > 0 ? handleClearCache : undefined}
                disabled={cacheSize === 0}
              >
                {STRINGS.CLEAR_CACHE_BUTTON}
              </ThemedText>
            }
          />
          <SettingsCard
            icon="log-out"
            label={STRINGS.SIGN_OUT}
            subtitle={user?.email || STRINGS.NO_EMAIL}
            rightType="chevron"
            onPress={handleSignOut}
          />
        </SettingsSection>

        {/* Danger Zone - Destructive actions */}
        <DangerZoneSection onResetReadingProgress={handleResetReadingProgress} />

        {/* App Footer */}
        <BrandFooter />
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
        footerNote={
          activePicker
            ? pickerConfigs[activePicker as keyof typeof pickerConfigs].footerNote
            : undefined
        }
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
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  clearButton: {
    minWidth: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
});

AccountScreen.displayName = 'AccountScreen';

export default AccountScreen;
