// External Libraries
import { SettingsPicker, TimePicker } from '@/components/ui';
import { useCallback, useMemo, useState, type FC } from 'react';
import { StyleSheet } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import { AccountBadge } from '@/components/account';
import {
  AboutSection,
  AccountSection,
  AppSection,
  ListeningSection,
  PracticeSection,
  ReadingSection,
  SupportSection,
} from '@/components/account/settings';
import { BrandFooter } from '@/components/explore';
import { ThemedView } from '@/components/primitives/ThemedView';
import { AUDIO_LANGUAGE_OPTIONS } from '@/constants/audioLanguageOptions';
import type { Theme } from '@/constants/colors';
import { DAILY_WORD_LIMIT_OPTIONS } from '@/constants/dailyWordLimitOptions';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { THEME_OPTIONS } from '@/constants/themeOptions';
import { useAccountScreen } from '@/hooks/account';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setAudioLanguagePreference, setDailyWordLimit } from '@/store/settingsSlice';
import { setTheme } from '@/store/themeSlice';
import { AudioLanguage } from '@/types/enums';
import { formatBytes } from '@/utils/cacheUtils';

// Type-safe picker state
type ActivePicker = 'theme' | 'audioLanguage' | 'dailyWordLimit' | null;

/**
 * Account settings.
 *
 * Composition only: every group is a section component that reads the slice
 * fields it needs. What lives here is the state those groups share — which
 * picker is open, and the single `SettingsPicker` / `TimePicker` pair they all
 * drive.
 */
const AccountScreen: FC = () => {
  const dispatch = useAppDispatch();
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const rawTheme = useAppSelectorShallow(state => state.theme.theme);
  const currentTheme = useMemo(() => rawTheme ?? ('dark' as const), [rawTheme]);

  const rawAudioLanguage = useAppSelectorShallow(state => state.settings.audioLanguagePreference);
  const currentAudioLanguage = useMemo(
    () =>
      rawAudioLanguage === AudioLanguage.ARABIC_ONLY
        ? AudioLanguage.ARABIC_ONLY
        : AudioLanguage.ENGLISH_ARABIC,
    [rawAudioLanguage],
  );

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

  const handlePickerClose = useCallback(() => {
    setActivePicker(null);
  }, []);

  const handleThemePress = useCallback(() => setActivePicker('theme'), []);
  const handleAudioLanguagePress = useCallback(() => setActivePicker('audioLanguage'), []);
  const handleDailyWordLimitPress = useCallback(() => setActivePicker('dailyWordLimit'), []);

  const handlePickerSelect = useCallback(
    (value: string | number) => {
      switch (activePicker) {
        case 'theme':
          dispatch(setTheme(value as Theme));
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
      audioLanguage: {
        title: STRINGS.AUDIO_LANGUAGE,
        options: AUDIO_LANGUAGE_OPTIONS,
        selectedValue: currentAudioLanguage,
      },
      dailyWordLimit: {
        title: STRINGS.DAILY_WORD_LIMIT,
        options: DAILY_WORD_LIMIT_OPTIONS,
        selectedValue: currentDailyWordLimit,
      },
    }),
    [currentTheme, currentAudioLanguage, currentDailyWordLimit],
  );

  // Format cache size for display
  const formattedCacheSize = cacheSize > 0 ? formatBytes(cacheSize) : STRINGS.NO_CACHED_FILES;

  // The two sheets are siblings of the scroll view, never children of it:
  // `@gorhom/bottom-sheet` positions itself `absolute; top: 0` against its
  // parent, so inside a scroll container it would anchor to the top of the
  // *content* and scroll away with it.
  return (
    <ThemedView includeBottomInset={false} safeAreaEdges={SAFE_AREA_EDGES} style={styles.container}>
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.container}
        useSafeArea={false}
        contentContainerStyle={styles.scrollContent}
        scrollViewProps={{
          style: styles.container,
          showsVerticalScrollIndicator: true,
        }}
      >
        {user && (
          <AccountBadge
            userEmail={user.email || STRINGS.NO_EMAIL}
            userId={user.id}
            createdAt={user.created_at}
          />
        )}

        <ReadingSection />

        <PracticeSection
          onDailyWordLimitPress={handleDailyWordLimitPress}
          onReminderTimePress={handleTimePickerOpen}
          onReminderToggle={enabled => void handleReminderToggle(enabled)}
          reminderTime={reminderTime}
          formatReminderTime={formatReminderTime}
        />

        <ListeningSection onAudioLanguagePress={handleAudioLanguagePress} />

        <AppSection
          onThemePress={handleThemePress}
          onClearCachePress={() => void handleClearCache()}
          cacheSizeText={formattedCacheSize}
        />

        <SupportSection onContactSupportPress={handleSupportContact} />

        {/* About + Follow OpenArabic */}
        <AboutSection />

        <AccountSection
          onSignOut={handleSignOut}
          onResetReadingProgress={handleResetReadingProgress}
        />

        <BrandFooter showDetails />
      </ThemedView>

      {/* Time Picker Modal */}
      <TimePicker
        initialHour={reminderTime.hour}
        initialMinute={reminderTime.minute}
        isVisible={showTimePicker}
        onClose={handleTimePickerClose}
        onTimeSet={(hour, minute) => void handleTimeSet(hour, minute)}
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

// Module-level so the array identity is stable across renders.
const SAFE_AREA_EDGES: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    // The 12px lead-in every other screen sits below its header by; this one
    // was alone on 24.
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
});

AccountScreen.displayName = 'AccountScreen';

export default AccountScreen;
