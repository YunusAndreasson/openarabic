// External Libraries
import { SettingsPicker, TimePicker } from '@/components/ui';
import * as StoreReview from 'expo-store-review';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type FC } from 'react';
import { Alert, StyleSheet } from 'react-native';

import { THEME_OPTIONS } from '@/constants/themeOptions';
import { ThemedView } from '@/components/ThemedView';
import { AccountBadge, SettingsCard, SettingsSection } from '@/components/account';
import { AboutSection, AppearanceSection, DangerZoneSection } from '@/components/account/settings';
import { BrandFooter } from '@/components/explore';
import { useTutorialContext, useVoiceGrading } from '@/components/providers';
import type { Theme } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAccountScreen } from '@/hooks/account';
import { useDailyWordLimit } from '@/hooks/vocabulary';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  selectAdaptiveNewWordPacingEnabled,
  setAdaptiveNewWordPacingEnabled,
  setAudioLanguagePreference,
  setAudioShuffleEnabled,
  setDailyWordLimit,
  setDisplayLanguagePreference,
  setVoiceEnabled,
  setWordTapShowsTooltip,
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
import { errorFeedback, lightFeedback, successFeedback } from '@/utils/haptics';
import { resetOnboarding } from '@/utils/onboardingStorage';

// Helper function for enum validation
function validateEnumValue<T>(value: unknown, validValues: readonly T[], defaultValue: T): T {
  return validValues.includes(value as T) ? (value as T) : defaultValue;
}

// Type-safe picker state
type ActivePicker = 'theme' | 'language' | 'audioLanguage' | 'dailyWordLimit' | null;

const AccountScreen: FC = () => {
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
  const currentLanguage = validateEnumValue(
    rawLanguagePreference,
    [DisplayLanguage.ARABIC_ONLY, DisplayLanguage.ARABIC_ENGLISH] as const,
    DisplayLanguage.ARABIC_ENGLISH,
  );

  const currentAudioLanguage = validateEnumValue(
    rawAudioLanguagePreference,
    [AudioLanguage.ARABIC_ONLY, AudioLanguage.ENGLISH_ARABIC] as const,
    AudioLanguage.ENGLISH_ARABIC,
  );

  const audioShuffleEnabled = useAppSelectorShallow(state => state.settings.audioShuffleEnabled);
  const adaptiveNewWordPacingEnabled = useAppSelectorShallow(selectAdaptiveNewWordPacingEnabled);
  const wordTapShowsTooltip = useAppSelectorShallow(
    state => state.settings.wordTapShowsTooltip ?? false,
  );
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
  const voice = useVoiceGrading();
  const dispatch = useAppDispatch();

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

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
    user,
    handleClearCache,
    cacheSize,
  } = useAccountScreen();

  // Tutorial management
  const { resetAllTutorials } = useTutorialContext();

  // Daily word limit tracking
  const { getRemainingWords } = useDailyWordLimit();
  const [wordsRemainingToday, setWordsRemainingToday] = useState<number | null>(null);

  // Refetch every time this screen gains focus, not just on mount — the
  // count changes from other screens (article reader, dictionary list,
  // practice empty-state quick-start) while Account may stay mounted in the
  // background tab stack, so a mount-only fetch could show a stale figure.
  useFocusEffect(
    useCallback(() => {
      const fetchRemainingWords = async () => {
        const remaining = await getRemainingWords();
        setWordsRemainingToday(remaining === Infinity ? null : remaining);
      };
      fetchRemainingWords();
    }, [getRemainingWords]),
  );

  const currentDailyWordLimitText = useMemo(() => {
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
            // Also re-enable the first-run intro + Get started checklist
            await resetOnboarding();
            successFeedback();
          } catch (error) {
            errorFeedback();
            handleError(error, {
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
      dispatch(setAudioShuffleEnabled(enabled));
    },
    [dispatch],
  );

  // Adaptive new-word pacing toggle handler
  const handleAdaptivePacingToggle = useCallback(
    (enabled: boolean) => {
      dispatch(setAdaptiveNewWordPacingEnabled(enabled));
    },
    [dispatch],
  );

  // Word-tap preview toggle — ON restores the lightweight inline tooltip;
  // OFF (default) opens the full word card directly on tap.
  const handleWordTapPreviewToggle = useCallback(
    (enabled: boolean) => {
      dispatch(setWordTapShowsTooltip(enabled));
    },
    [dispatch],
  );

  // Voice grading toggle — flipping ON triggers the ~460 MB Parakeet download
  // and the OS mic prompt the next time the user enters a Practice card.
  const handleVoiceToggle = useCallback(
    (enabled: boolean) => {
      dispatch(setVoiceEnabled(enabled));
    },
    [dispatch],
  );

  const voiceSubtitle = useMemo(() => {
    if (!voiceEnabled) return STRINGS.SPEAK_ANSWER_IDLE_SUBTITLE;
    if (voice.error) return STRINGS.SPEAK_ANSWER_ERROR_SUBTITLE;
    if (voice.isReady) return STRINGS.SPEAK_ANSWER_READY_SUBTITLE;
    const pct = Math.round((voice.downloadProgress ?? 0) * 100);
    return STRINGS.SPEAK_ANSWER_DOWNLOADING_SUBTITLE.replace('{pct}', String(pct));
  }, [voiceEnabled, voice.error, voice.isReady, voice.downloadProgress]);

  // Rate app handler
  const handleRequestReview = useCallback(async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        handleError(new Error('StoreReview not available'), {
          analyticsEventName: 'Store_Review_Not_Available',
          sentryTags: { location: 'account', action: 'store_review' },
          sentryExtra: { storeUrl: StoreReview.storeUrl() },
          sentrySeverity: 'info',
          showToast: false,
        });
        return;
      }
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      await StoreReview.requestReview();
      lightFeedback();
    } catch (error) {
      handleError(error, {
        analyticsEventName: 'Store_Review_Request_Failed',
        sentryTags: { location: 'account', action: 'store_review' },
        showToast: true,
        sentrySeverity: 'warning',
      });
    }
  }, []);

  const handlePickerSelect = useCallback(
    (value: string | number) => {
      switch (activePicker) {
        case 'theme':
          dispatch(setTheme(value as Theme));
          break;
        case 'language':
          dispatch(setDisplayLanguagePreference(value as DisplayLanguage));
          break;
        case 'audioLanguage':
          dispatch(setAudioLanguagePreference(value as AudioLanguage));
          break;
        case 'dailyWordLimit':
          dispatch(setDailyWordLimit(value as number));
          break;
        case null:
          // No picker open, so there is nothing to apply the selection to.
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
      },
    }),
    [currentTheme, currentLanguage, currentAudioLanguage, currentDailyWordLimit],
  );

  // Get current audio language display text
  const currentAudioLanguageText =
    currentAudioLanguage === 'arabic' ? STRINGS.AUDIO_LANGUAGE_ARABIC : STRINGS.BILINGUAL_LABEL;

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
          onThemePress={() => handlePickerOpen('theme')}
          onLanguagePress={() => handlePickerOpen('language')}
        />

        {/* Learning - Study settings (most frequently adjusted) */}
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
            icon="speedometer"
            label={STRINGS.ADAPTIVE_PACING}
            subtitle={STRINGS.ADAPTIVE_PACING_SUBTITLE}
            rightType="toggle"
            toggleValue={adaptiveNewWordPacingEnabled}
            onToggleChange={handleAdaptivePacingToggle}
          />
          <SettingsCard
            icon="chatbubble-ellipses"
            label={STRINGS.WORD_TAP_PREVIEW}
            subtitle={STRINGS.WORD_TAP_PREVIEW_SUBTITLE}
            rightType="toggle"
            toggleValue={wordTapShowsTooltip}
            onToggleChange={handleWordTapPreviewToggle}
          />
          <SettingsCard
            icon="school"
            label={STRINGS.RESET_TUTORIALS}
            rightType="none"
            onPress={handleResetTutorials}
          />
          <SettingsCard
            icon="notifications"
            label={STRINGS.STUDY_REMINDERS}
            subtitle={STRINGS.SMART_REMINDERS_SUBTITLE}
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

        {/* Audio - Audio settings */}
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
            rightType="toggle"
            toggleValue={audioShuffleEnabled}
            onToggleChange={handleAudioShuffleToggle}
          />
          <SettingsCard
            icon="mic"
            label={STRINGS.SPEAK_ANSWER}
            subtitle={voiceSubtitle}
            rightType="toggle"
            toggleValue={voiceEnabled}
            onToggleChange={handleVoiceToggle}
          />
        </SettingsSection>

        {/* Storage - Cache management */}
        <SettingsSection title={STRINGS.STORAGE_SECTION}>
          <SettingsCard
            icon="trash-outline"
            label={STRINGS.CLEAR_CACHE}
            subtitle={formattedCacheSize}
            rightType="none"
            onPress={handleClearCache}
          />
        </SettingsSection>

        {/* Support - Help, assistance, and rating */}
        <SettingsSection title={AccountSection.SUPPORT}>
          <SettingsCard
            icon="help-circle"
            label={STRINGS.HELP_CENTER}
            rightType="chevron"
            onPress={() => router.push(ROUTE_PATHS.ACCOUNT_HELP)}
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
            rightType="none"
            onPress={handleRequestReview}
          />
        </SettingsSection>

        {/* Legal + Community (split sections rendered by AboutSection) */}
        <AboutSection />

        {/* Advanced - Voice grading model status + recording knobs */}
        <SettingsSection title={STRINGS.ADVANCED}>
          <SettingsCard
            icon="construct"
            label={STRINGS.ADVANCED_VOICE_GRADING}
            subtitle={STRINGS.ADVANCED_VOICE_GRADING_SUBTITLE}
            rightType="chevron"
            onPress={() => router.push(ROUTE_PATHS.ACCOUNT_ADVANCED)}
          />
        </SettingsSection>

        {/* Account - Session management */}
        <SettingsSection title={STRINGS.ACCOUNT}>
          <SettingsCard
            icon="log-out"
            label={STRINGS.SIGN_OUT}
            rightType="none"
            onPress={handleSignOut}
          />
        </SettingsSection>

        {/* Danger Zone - Destructive actions */}
        <DangerZoneSection onResetReadingProgress={handleResetReadingProgress} />

        {/* App Footer */}
        <BrandFooter showDetails />
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
        title={activePicker ? pickerConfigs[activePicker].title : ''}
        options={activePicker ? pickerConfigs[activePicker].options : []}
        selectedValue={activePicker ? pickerConfigs[activePicker].selectedValue : undefined}
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
  },
  scrollView: {
    flex: 1,
  },
});

AccountScreen.displayName = 'AccountScreen';

export default AccountScreen;
