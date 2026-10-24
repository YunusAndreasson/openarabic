import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { readingProgressQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAudioCache } from '@/hooks/audio/useAudioCache';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import { ensurePermissions } from '@/services/notificationService';
import { ReadingProgressService } from '@/services/readingProgress';
import { supabase } from '@/services/supabase';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { reminderClockSet, remindersToggled } from '@/store/settingsSlice';
import { ToastType } from '@/types/enums';
import { formatBytes } from '@/utils/cacheUtils';
import { format24HourTime } from '@/utils/dateTimeUtils';
import { handleError } from '@/utils/errorHandling';
import { fillTemplate } from '@/utils/fillTemplate';
import { lightFeedback } from '@/utils/haptics';
import { recordAccepted } from '@/utils/notificationPromptStorage';
import { flushPersistedQueryCache } from '@/utils/queryPersistence';

/** iOS never re-prompts, so a refused reminder toggle can only point at Settings. */
function showEnableNotificationsAlert(): void {
  Alert.alert(STRINGS.ENABLE_NOTIFICATIONS, STRINGS.TURN_ON_NOTIFICATIONS, [
    { text: STRINGS.CANCEL, style: 'cancel' },
    { text: STRINGS.OPEN_SETTINGS, onPress: () => void Linking.openSettings() },
  ]);
}

export const useAccountScreen = () => {
  const dispatch = useAppDispatch();
  const reminderTime = useAppSelector(state => state.settings.reminderTime);
  const { clearCache, getCacheSize } = useAudioCache();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  // The session's user is enough: the screen shows only which address is
  // signed in. A fresh `getUser()` round trip used to run on every visit, for
  // the "member since" date the account card no longer shows.
  const { user } = useAuth();

  // Load cache size on component mount
  useEffect(() => {
    const loadCacheSize = async () => {
      try {
        const audioSize = await getCacheSize();
        setCacheSize(audioSize);
      } catch (error) {
        void handleError(error, { showToast: false });
      }
    };

    void loadCacheSize();
  }, [getCacheSize]);

  // Clear all caches: audio files, query data, and persisted storage. With
  // nothing cached the row is not pressable at all (see AppSection), so the
  // guard only covers a stale caller.
  const handleClearCache = useCallback(async () => {
    if (cacheSize === 0) return;

    Alert.alert(
      STRINGS.CLEAR_CACHE,
      fillTemplate(STRINGS.CLEAR_CACHE_CONFIRMATION, { size: formatBytes(cacheSize) }),
      [
        {
          text: STRINGS.CANCEL,
          style: 'cancel',
        },
        {
          text: STRINGS.CLEAR,
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                // Clear audio cache
                await clearCache();
                setCacheSize(0);

                // Drop every cached query — but only the queries. A paused
                // mutation is a write the server has not seen yet (an offline
                // review grade, a word saved on the train), and `clear()`
                // empties the mutation cache too, discarding it for good.
                queryClient.removeQueries();

                // Overwrite the persisted copy with what is left: no queries,
                // and those pending writes, so they still resume after a
                // restart.
                await flushPersistedQueryCache(queryClient);

                // No success dialog: the row's own size line already turns
                // into "Nothing to clear", which is the confirmation.
                lightFeedback();
              } catch (error) {
                Alert.alert(STRINGS.ERROR, STRINGS.FAILED_TO_CLEAR_OFFLINE_CACHE);
                void handleError(error, { showToast: false });
              }
            })(),
        },
      ],
    );
  }, [cacheSize, clearCache, queryClient]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      STRINGS.SIGN_OUT,
      STRINGS.SIGN_OUT_CONFIRMATION,
      [
        {
          text: STRINGS.CANCEL,
          style: 'cancel',
        },
        {
          text: STRINGS.SIGN_OUT,
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                // Stop audio before signing out to prevent stale audio state
                await simpleAudioService.stop();
                await analytics.trackSignOut();
                const { error } = await supabase.auth.signOut();
                if (error) {
                  Alert.alert(STRINGS.ERROR, error.message);
                  return;
                }
                await analytics.reset();
                router.replace(ROUTE_PATHS.AUTH);
              } catch (error) {
                Alert.alert(
                  STRINGS.ERROR,
                  error instanceof Error ? error.message : STRINGS.FAILED_TO_SIGN_OUT,
                );
              }
            })(),
        },
      ],
      { cancelable: true },
    );
  }, []);

  const handleResetReadingProgress = () => {
    if (!user?.id) {
      Alert.alert(STRINGS.ERROR, STRINGS.NO_USER_ID_AVAILABLE);
      return;
    }

    // No haptic here: opening a confirmation is not an error. The alert's red
    // button carries the warning.
    Alert.alert(
      STRINGS.RESET_READING_PROGRESS,
      STRINGS.THIS_WILL_DELETE_ALL_READING_PROGRESS,
      [
        {
          text: STRINGS.CANCEL,
          style: 'cancel',
        },
        {
          text: STRINGS.RESET,
          style: 'destructive',
          onPress: () =>
            void (async () => {
              try {
                // Delete all reading progress from database (or reset to 0 if RLS blocks DELETE)
                await ReadingProgressService.deleteAllProgress(user.id);

                // Reset, not invalidate: the old positions must not stay on
                // screen while the refetch is in flight, so the entries go back
                // to their initial state and every mounted one refetches the
                // fresh (empty or reset) rows. Removing them and then calling
                // refetchQueries — as this did — refetched nothing: refetch only
                // touches entries that exist, and removal had just deleted them.
                await Promise.all([
                  queryClient.resetQueries({
                    queryKey: readingProgressQueries.bulk(user.id).queryKey,
                  }),
                  queryClient.resetQueries({
                    queryKey: readingProgressQueries.readingList(user.id).queryKey,
                  }),
                ]);

                // A toast, not a dialog: there is nothing to answer, and the
                // settings screen itself shows no reading position to update.
                lightFeedback();
                showToast(
                  STRINGS.READING_PROGRESS_RESET_SUCCESSFULLY,
                  undefined,
                  ToastType.SUCCESS,
                );
              } catch (error) {
                Alert.alert(STRINGS.ERROR, STRINGS.FAILED_TO_RESET_READING_PROGRESS);
                void handleError(error, { showToast: false });
              }
            })(),
        },
      ],
      { cancelable: true },
    );
  };

  const handleReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        try {
          const granted = await ensurePermissions();

          if (!granted) {
            showEnableNotificationsAlert();
            return;
          }
        } catch (error) {
          void handleError(error, { showToast: false });
          showEnableNotificationsAlert();
          return;
        }

        // The user made the choice here — the completion-screen priming card
        // should never ask again.
        void recordAccepted();
      }

      // useSmartNotifications watches this setting and reschedules the plan.
      dispatch(remindersToggled(enabled));
      void analytics.track(ANALYTICS_EVENTS.SMART_REMINDERS_TOGGLED, { enabled });
      lightFeedback();
    },
    [dispatch],
  );

  const handleTimePickerOpen = useCallback(() => {
    setShowTimePicker(true);
  }, []);

  const handleTimePickerClose = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimeSet = useCallback(
    (hour: number, minute: number) => {
      dispatch(reminderClockSet({ hour, minute }));
      lightFeedback();
    },
    [dispatch],
  );

  const handleSupportContact = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FEEDBACK);
  }, []);

  return {
    reminderTime,
    formatReminderTime: format24HourTime,
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
  };
};
