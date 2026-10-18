import { memo, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { useVoiceGrading } from '@/components/providers';
import { DAILY_WORD_LIMIT_UNLIMITED } from '@/constants/dailyWordLimitOptions';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useDailyWordLimitSummary } from '@/hooks/account';
import { useColors } from '@/hooks/theme/useColors';
import { useVoiceModel } from '@/hooks/voice/useVoiceModel';
import { deleteVoiceModel } from '@/services/voiceModelStore';
import { voiceReadiness } from '@/utils/voiceReadiness';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import {
  selectAdaptiveNewWordPacingEnabled,
  selectDailyWordLimit,
  setAdaptiveNewWordPacingEnabled,
  setVoiceEnabled,
  setVoiceHandsFree,
  selectVoiceHandsFree,
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
 * The conditional rows sit at the tail of the group they belong to, so
 * switching one on appends a row rather than displacing everything beneath it:
 * hands-free and "Remove voice model" after the voice toggle (the second only
 * while the model is on disk; Advanced only in development builds), reminder
 * time after the reminder toggle. The voice rows used to live in their own
 * section five groups further down, nowhere near the toggle that makes them
 * relevant.
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
    const colors = useColors();
    const voice = useVoiceGrading();
    const model = useVoiceModel();

    const currentDailyWordLimit = useAppSelectorShallow(selectDailyWordLimit);
    // Through the selector, not the raw field — see selectHapticsEnabled for
    // why a field added after a user's install rehydrates as `undefined`.
    const adaptiveNewWordPacingEnabled = useAppSelectorShallow(selectAdaptiveNewWordPacingEnabled);
    const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);
    const voiceHandsFree = useAppSelectorShallow(selectVoiceHandsFree);

    const dailyLimitSummary = useDailyWordLimitSummary();

    const currentDailyWordLimitText = useMemo(() => {
      // Same constant the "Unlimited" option card renders, not a second literal
      // spelling of it.
      if (currentDailyWordLimit === DAILY_WORD_LIMIT_UNLIMITED) {
        return STRINGS.DAILY_LIMIT_UNLIMITED;
      }
      return STRINGS.DAILY_LIMIT_WORDS_COUNT.replace('{count}', String(currentDailyWordLimit));
    }, [currentDailyWordLimit]);

    // Every voice surface reads one resolver now. This row used to answer from
    // the toggle alone — "Answer out loud instead of tapping" whenever voice was
    // off — which becomes a lie the moment a download is running underneath it,
    // and it disagreed with the Advanced screen about what "ready" meant.
    const voiceSubtitle = useMemo(() => {
      const readiness = voiceReadiness({
        voiceEnabled,
        micDenied: false,
        model,
        engine: { isReady: voice.isReady, isWarming: voice.isWarming, error: null },
      });
      switch (readiness.kind) {
        case 'off':
          return STRINGS.SPEAK_ANSWER_IDLE_SUBTITLE;
        case 'ready':
        // "Ready. Uses 100 MB on device" is a statement about the download, so
        // bytes-on-disk is exactly what it should report.
        case 'model-ready':
          return STRINGS.SPEAK_ANSWER_READY_SUBTITLE;
        case 'waiting-wifi':
          return STRINGS.SPEAK_ANSWER_WAITING_WIFI_SUBTITLE;
        case 'failed':
          return readiness.reason === 'disk-space'
            ? STRINGS.SPEAK_ANSWER_NO_SPACE_SUBTITLE
            : STRINGS.SPEAK_ANSWER_ERROR_SUBTITLE;
        case 'pending':
          // Nothing is downloading yet, so the download subtitle would be a lie.
          return STRINGS.SPEAK_ANSWER_IDLE_SUBTITLE;
        case 'mic-denied':
          // Unreachable from here (micDenied is false above) — the permission is
          // the review screen's story to tell, not a settings subtitle's.
          return STRINGS.SPEAK_ANSWER_IDLE_SUBTITLE;
        default:
          return STRINGS.SPEAK_ANSWER_DOWNLOADING_SUBTITLE.replace(
            '{pct}',
            String(Math.round(readiness.progress * 100)),
          );
      }
    }, [voiceEnabled, model, voice.isReady, voice.isWarming]);

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

    const handleHandsFreeToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setVoiceHandsFree(enabled));
      },
      [dispatch],
    );

    const handleAdvancedPress = useCallback(() => {
      router.push(ROUTE_PATHS.ACCOUNT_ADVANCED);
    }, []);

    // Nothing else in the app reclaims the ~100 MB, and with voice on by default
    // that would otherwise be permanent for every learner.
    //
    // Removing also turns voice OFF, and that is the whole reason it works: the
    // prefetch is gated on `voiceEnabled`, so leaving it on would download the
    // model again within seconds and reclaim nothing. Turning "Speak the
    // answer" back on fetches it again.
    const handleRemoveModel = () => {
      Alert.alert(
        STRINGS.ADVANCED_MODEL_REMOVE_CONFIRM_TITLE,
        STRINGS.ADVANCED_MODEL_REMOVE_CONFIRM_BODY,
        [
          { text: STRINGS.CANCEL, style: 'cancel' },
          {
            text: STRINGS.ADVANCED_MODEL_REMOVE,
            style: 'destructive',
            onPress: () => {
              dispatch(setVoiceEnabled(false));
              void deleteVoiceModel();
            },
          },
        ],
      );
    };

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
            icon="ear"
            label={STRINGS.VOICE_HANDS_FREE}
            subtitle={STRINGS.VOICE_HANDS_FREE_SUBTITLE}
            rightType="toggle"
            toggleValue={voiceHandsFree}
            onToggleChange={handleHandsFreeToggle}
          />
        )}
        {/* Development builds only: the recording knobs behind it are for
            testing capture on a device, and production reads their shipped
            values whatever is stored. */}
        {__DEV__ && voiceEnabled && (
          <SettingsCard
            icon="construct"
            label={STRINGS.ADVANCED_VOICE_GRADING}
            subtitle={STRINGS.ADVANCED_VOICE_GRADING_SUBTITLE}
            rightType="chevron"
            onPress={handleAdvancedPress}
          />
        )}
        {/* The one voice control a learner needs beyond the toggle: getting the
            ~100 MB back. Only while the model is actually on disk. */}
        {model.state === 'ready' && (
          <SettingsCard
            icon="trash"
            label={STRINGS.ADVANCED_MODEL_REMOVE}
            iconColor={colors.error}
            textColor="error"
            onPress={handleRemoveModel}
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
