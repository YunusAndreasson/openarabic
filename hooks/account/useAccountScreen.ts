import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { readingProgressQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAudioCache } from '@/hooks/audio/useAudioCache';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import { ensurePermissions } from '@/services/notificationService';
import { ReadingProgressService } from '@/services/readingProgress';
import { supabase } from '@/services/supabase';
import { formatBytes } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback, errorFeedback } from '@/utils/haptics';
import { recordAccepted } from '@/utils/notificationPromptStorage';
import { clearPersistedQueryCache } from '@/utils/queryPersistence';

/** iOS never re-prompts, so a refused reminder toggle can only point at Settings. */
function showEnableNotificationsAlert(): void {
  Alert.alert(STRINGS.ENABLE_NOTIFICATIONS, STRINGS.TURN_ON_NOTIFICATIONS, [
    { text: STRINGS.CANCEL, style: 'cancel' },
    { text: STRINGS.OPEN_SETTINGS, onPress: () => void Linking.openSettings() },
  ]);
}

const useUserWithCreationDate = () => {
  const { user } = useAuth();
  const [userWithCreatedAt, setUserWithCreatedAt] = useState<typeof user>(user);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            void handleError(error, { showToast: false });
          } else if (data.user) {
            setUserWithCreatedAt(data.user);
          }
        } catch (error) {
          void handleError(error, { showToast: false });
        }
      }
    };

    void fetchUserData();
  }, [user?.id]);

  return userWithCreatedAt;
};

export const useAccountScreen = () => {
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const { clearCache, getCacheSize } = useAudioCache();
  const queryClient = useQueryClient();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const user = useUserWithCreationDate();

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

  // Clear all caches: audio files, query data, and persisted storage
  const handleClearCache = useCallback(async () => {
    if (cacheSize === 0) {
      Alert.alert(STRINGS.NO_CACHE, STRINGS.NO_CACHED_FILES);
      return;
    }

    Alert.alert(
      STRINGS.CLEAR_CACHE,
      STRINGS.CLEAR_CACHE_CONFIRMATION.replace('{size}', formatBytes(cacheSize)),
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

                // Clear React Query in-memory cache
                queryClient.clear();

                // Clear React Query persisted AsyncStorage cache
                await clearPersistedQueryCache();

                lightFeedback();
                Alert.alert(STRINGS.SUCCESS, STRINGS.CLEAR_CACHE_SUCCESS);
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
      Alert.alert(STRINGS.ERROR, 'No user ID available');
      return;
    }

    errorFeedback();
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

                // Completely remove all reading progress queries from cache
                // Using removeQueries instead of invalidate to force complete cache clear
                queryClient.removeQueries({
                  queryKey: readingProgressQueries.bulk(user.id).queryKey,
                });
                queryClient.removeQueries({
                  queryKey: readingProgressQueries.readingList(user.id).queryKey,
                });

                // Refetch to populate cache with fresh (empty or reset) data
                await queryClient.refetchQueries({
                  queryKey: readingProgressQueries.bulk(user.id).queryKey,
                });

                lightFeedback();
                Alert.alert(STRINGS.SUCCESS, STRINGS.READING_PROGRESS_RESET_SUCCESSFULLY);
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
      }

      if (enabled) {
        // The user made the choice here — the completion-screen priming card
        // should never ask again.
        void recordAccepted();
      }

      try {
        const newReminderTime = { ...reminderTime, enabled };
        await updateReminderTime(newReminderTime);
        void analytics.track(ANALYTICS_EVENTS.SMART_REMINDERS_TOGGLED, { enabled });
        lightFeedback();
      } catch (error) {
        void handleError(error, { showToast: false });
        Alert.alert(STRINGS.ERROR, 'Could not update reminders. Please try again.');
      }
    },
    [reminderTime, updateReminderTime],
  );

  const handleTimePickerOpen = useCallback(() => {
    setShowTimePicker(true);
  }, []);

  const handleTimePickerClose = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimeSet = useCallback(
    async (hour: number, minute: number) => {
      try {
        const newReminderTime = { ...reminderTime, hour, minute };
        await updateReminderTime(newReminderTime);
        lightFeedback();
      } catch (error) {
        void handleError(error, { showToast: false });
        Alert.alert(STRINGS.ERROR, 'Could not update the reminder time. Please try again.');
      }
    },
    [reminderTime, updateReminderTime],
  );

  const handleSupportContact = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FEEDBACK);
  }, []);

  return {
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
  };
};
