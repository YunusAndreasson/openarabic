import { memo, useCallback, useMemo } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { useVoiceGrading } from '@/components/providers';
import { DAILY_WORD_LIMIT_UNLIMITED } from '@/constants/dailyWordLimitOptions';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useDailyWordLimitSummary } from '@/hooks/account';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  selectAdaptiveNewWordPacingEnabled,
  setAdaptiveNewWordPacingEnabled,
  setVoiceEnabled,
} from '@/store/settingsSlice';
import type { ReminderTime } from '@/types/notifications.types';

interface PracticeSectionProps {
  /** Open the new-words-per-day picker */
  onDailyWordLimitPress: () => void;
  /** Open the reminder time picker */
  onReminderTimePress: () => void;
  /** Toggle smart reminders (requests the OS permission) */
  onReminderToggle: (enabled: boolean) => void;
  reminderTime: ReminderTime;
  formatReminderTime: (hour: number, minute: number) => string;
}

/**
 * Practice settings — the pace of new words, how answers are graded, and when
 * to be nudged.
 *
 * Two rows are conditional, and both sit at the tail of the pair they belong
 * to, so switching one on appends a row rather than displacing everything
 * beneath it. "Voice grading" in particular used to live in its own section
 * five groups further down, nowhere near the toggle that makes it relevant.
 */
export const PracticeSection = memo<PracticeSectionProps>(
  ({
    onDailyWordLimitPress,
    onReminderTimePress,
    onReminderToggle,
    reminderTime,
    formatReminderTime,
  }) => {
    const dispatch = useAppDispatch();
    const voice = useVoiceGrading();

    const rawDailyWordLimit = useAppSelectorShallow(state => state.settings.dailyWordLimit);
    // Through the selector, not the raw field — see selectHapticsEnabled for
    // why a field added after a user's install rehydrates as `undefined`.
    const adaptiveNewWordPacingEnabled = useAppSelectorShallow(selectAdaptiveNewWordPacingEnabled);
    const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);

    const dailyLimitSummary = useDailyWordLimitSummary();

    const currentDailyWordLimit = useMemo(() => {
      // Validate: must be a number (0, 10, 20, or 30)
      if (typeof rawDailyWordLimit === 'number' && rawDailyWordLimit >= 0) {
        return rawDailyWordLimit;
      }
      return 10; // Default to 10 words
    }, [rawDailyWordLimit]);

    const currentDailyWordLimitText = useMemo(() => {
      // Same constant the "Unlimited" option card renders, not a second literal
      // spelling of it.
      if (currentDailyWordLimit === DAILY_WORD_LIMIT_UNLIMITED) {
        return STRINGS.DAILY_LIMIT_UNLIMITED;
      }
      return STRINGS.DAILY_LIMIT_WORDS_COUNT.replace('{count}', String(currentDailyWordLimit));
    }, [currentDailyWordLimit]);

    const voiceSubtitle = useMemo(() => {
      if (!voiceEnabled) return STRINGS.SPEAK_ANSWER_IDLE_SUBTITLE;
      if (voice.error) return STRINGS.SPEAK_ANSWER_ERROR_SUBTITLE;
      if (voice.isReady) return STRINGS.SPEAK_ANSWER_READY_SUBTITLE;
      const pct = Math.round((voice.downloadProgress ?? 0) * 100);
      return STRINGS.SPEAK_ANSWER_DOWNLOADING_SUBTITLE.replace('{pct}', String(pct));
    }, [voiceEnabled, voice.error, voice.isReady, voice.downloadProgress]);

    const handleAdaptivePacingToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setAdaptiveNewWordPacingEnabled(enabled));
      },
      [dispatch],
    );

    // Voice grading toggle — flipping ON triggers the Parakeet model download
    // and the OS mic prompt the next time the user enters a Practice card.
    const handleVoiceToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setVoiceEnabled(enabled));
      },
      [dispatch],
    );

    const handleAdvancedPress = useCallback(() => {
      router.push(ROUTE_PATHS.ACCOUNT_ADVANCED);
    }, []);

    return (
      <SettingsSection
        title={STRINGS.PRACTICE_SECTION}
        subtitle={STRINGS.PRACTICE_SECTION_SUBTITLE}
      >
        <SettingsCard
          icon="book"
          label={STRINGS.DAILY_WORD_LIMIT}
          subtitle={dailyLimitSummary ?? undefined}
          rightType="text-chevron"
          rightText={currentDailyWordLimitText}
          onPress={onDailyWordLimitPress}
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
          icon="mic"
          label={STRINGS.SPEAK_ANSWER}
          subtitle={voiceSubtitle}
          rightType="toggle"
          toggleValue={voiceEnabled}
          onToggleChange={handleVoiceToggle}
        />
        {voiceEnabled && (
          <SettingsCard
            icon="construct"
            label={STRINGS.ADVANCED_VOICE_GRADING}
            subtitle={STRINGS.ADVANCED_VOICE_GRADING_SUBTITLE}
            rightType="chevron"
            onPress={handleAdvancedPress}
          />
        )}
        <SettingsCard
          icon="notifications"
          label={STRINGS.STUDY_REMINDERS}
          subtitle={STRINGS.SMART_REMINDERS_SUBTITLE}
          rightType="toggle"
          toggleValue={reminderTime.enabled}
          onToggleChange={onReminderToggle}
        />
        {reminderTime.enabled && (
          <SettingsCard
            icon="time"
            label={STRINGS.REMINDER_TIME}
            rightType="text-chevron"
            rightText={formatReminderTime(reminderTime.hour, reminderTime.minute)}
            onPress={onReminderTimePress}
          />
        )}
      </SettingsSection>
    );
  },
);

PracticeSection.displayName = 'PracticeSection';
