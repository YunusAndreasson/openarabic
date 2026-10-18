// External Libraries
import { SettingsPicker, TimePicker } from '@/components/ui';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

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
import { AUDIO_LANGUAGE_OPTIONS } from '@/constants/audioLanguageOptions';
import type { Theme } from '@/constants/colors';
import { DAILY_WORD_LIMIT_OPTIONS } from '@/constants/dailyWordLimitOptions';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { THEME_OPTIONS } from '@/constants/themeOptions';
import { useAccountScreen } from '@/hooks/account';
import { useMiniPlayerClearance } from '@/hooks/audio/useMiniPlayerClearance';
import { useTabBarAutoHide } from '@/hooks/ui/useTabBarAutoHide';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  selectDailyWordLimit,
  setAudioLanguagePreference,
  setDailyWordLimit,
} from '@/store/settingsSlice';
import { setTheme } from '@/store/themeSlice';
import { AudioLanguage } from '@/types/enums';
import { formatBytes } from '@/utils/cacheUtils';

// Type-safe picker state
type ActivePicker = 'theme' | 'audioLanguage' | 'dailyWordLimit' | null;

/**
 * Settings (the `account` tab).
 *
 * Composition only: every group is a section component that reads the slice
 * fields it needs. What lives here is the state those groups share — which
 * picker is open, and the single `SettingsPicker` / `TimePicker` pair they all
 * drive.
 */
const AccountScreen = () => {
  const dispatch = useAppDispatch();
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const tabBarAutoHide = useTabBarAutoHide();
  const miniPlayerClearance = useMiniPlayerClearance();

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

  const currentDailyWordLimit = useAppSelectorShallow(selectDailyWordLimit);

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

  const scrollContentStyle = useMemo(
    () => [styles.scrollContent, { paddingBottom: miniPlayerClearance }],
    [miniPlayerClearance],
  );

  // A bare ScrollView at the top of the tree, NOT a nested pair of ThemedViews.
  // UIKit finds the scroll view that drives the large-title collapse with a
  // shallow search of the screen's view controller, so the two native views
  // this screen used to wrap it in (a SafeAreaView, then a plain View) hid it:
  // Account was the one tab whose big title never shrank into the nav bar.
  // Explore, Playlist and Practice all put their scrollable at the top for the
  // same reason — see `createTabHeaderOptions`.
  //
  // Nothing is lost by dropping those wrappers. The route's own content view
  // carries the theme background (that is why the other three set no
  // backgroundColor either), the app is portrait-only so the left/right insets
  // the SafeAreaView applied are always zero, and the bottom inset was already
  // switched off — the clearance now comes from `useMiniPlayerClearance`.
  //
  // The two sheets stay siblings of the scroll view, never children of it:
  // `@gorhom/bottom-sheet` positions itself `absolute; top: 0` against its
  // parent, so inside a scroll container it would anchor to the top of the
  // *content* and scroll away with it. A fragment keeps them siblings without
  // adding back a native view between the route and the ScrollView.
  return (
    <>
      <ScrollView
        {...tabBarAutoHide}
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator
        contentContainerStyle={scrollContentStyle}
      >
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
          // With nothing cached the row is a statement, not a button.
          onClearCachePress={cacheSize > 0 ? () => void handleClearCache() : undefined}
          cacheSizeText={formattedCacheSize}
        />

        <SupportSection onContactSupportPress={handleSupportContact} />

        {/* About + Follow OpenArabic */}
        <AboutSection />

        <AccountSection
          email={user?.email || STRINGS.NO_EMAIL}
          onSignOut={handleSignOut}
          onResetReadingProgress={handleResetReadingProgress}
        />

        <BrandFooter showDetails />
      </ScrollView>

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
    </>
  );
};

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
