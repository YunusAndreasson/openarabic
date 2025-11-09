import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { readingProgressQueries } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAudioCache } from '@/hooks/audio/useAudioCache';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import pkg from '@/package.json';
import { analytics } from '@/services/analytics';
import { ReadingProgressService } from '@/services/readingProgress';
import { supabase } from '@/services/supabase';
import { UiAction } from '@/types/enums';
import { formatBytes } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback, errorFeedback } from '@/utils/haptics';
import { clearPersistedQueryCache } from '@/utils/queryPersistence';

const useUserWithCreationDate = () => {
  const { user } = useAuth();
  const [userWithCreatedAt, setUserWithCreatedAt] = useState<typeof user>(user);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase.auth.getUser();
          if (error) {
            handleError(error, { showToast: false });
          } else if (data.user) {
            setUserWithCreatedAt(data.user);
          }
        } catch (error) {
          handleError(error as Error, { showToast: false });
        }
      }
    };

    fetchUserData();
  }, [user?.id]);

  return userWithCreatedAt;
};

export const useAccountScreen = () => {
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const { clearCache, getCacheSize } = useAudioCache();
  const queryClient = useQueryClient();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [, setNotificationPermissions] = useState(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const user = useUserWithCreationDate();
  const isMounted = useRef(true);

  // Load cache size on component mount
  useEffect(() => {
    const loadCacheSize = async () => {
      try {
        const audioSize = await getCacheSize();
        if (isMounted.current) {
          setCacheSize(audioSize);
        }
      } catch (error) {
        handleError(error as Error, { showToast: false });
      }
    };

    loadCacheSize();

    return () => {
      isMounted.current = false;
    };
  }, [getCacheSize]);

  // Clear all caches: audio files, query data, and persisted storage
  const handleClearCache = useCallback(async () => {
    if (cacheSize === 0) {
      Alert.alert(STRINGS.NO_CACHE, STRINGS.NO_CACHED_FILES);
      return;
    }

    Alert.alert(
      STRINGS.CLEAR_CACHE,
      `This will clear ${formatBytes(cacheSize)} of cached data including audio files, articles, and all app data. ${
        STRINGS.DATA_RELOAD_REQUIRED
      }`,
      [
        {
          text: UiAction.CANCEL,
          style: 'cancel',
        },
        {
          text: UiAction.CLEAR,
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear audio cache
              await clearCache();
              setCacheSize(0);

              // Clear React Query in-memory cache
              queryClient.clear();

              // Clear React Query persisted AsyncStorage cache
              await clearPersistedQueryCache();

              lightFeedback();
              Alert.alert(
                STRINGS.SUCCESS,
                'All caches cleared successfully. Audio, articles, and app data will reload when needed.',
              );
            } catch (error) {
              Alert.alert(STRINGS.ERROR, STRINGS.FAILED_TO_CLEAR_OFFLINE_CACHE);
              handleError(error as Error, { showToast: false });
            }
          },
        },
      ],
    );
  }, [cacheSize, clearCache, queryClient]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      STRINGS.SIGN_OUT,
      STRINGS.ARE_YOU_SURE_SIGN_OUT,
      [
        {
          text: UiAction.CANCEL,
          style: 'cancel',
        },
        {
          text: STRINGS.SIGN_OUT,
          style: 'destructive',
          onPress: async () => {
            try {
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
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  const handleResetReadingProgress = useCallback(() => {
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
          text: UiAction.CANCEL,
          style: 'cancel',
        },
        {
          text: UiAction.RESET,
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all reading progress from database
              await ReadingProgressService.deleteAllProgress(user.id);

              // Invalidate and refetch all reading progress queries
              // Note: Invalidation alone doesn't trigger refetch because queries have refetchOnMount: false
              await readingProgressQueries.invalidateAll(queryClient, user.id);
              // Explicitly refetch to update UI immediately
              await queryClient.refetchQueries({
                queryKey: readingProgressQueries.keys.bulk(user.id),
              });

              lightFeedback();
              Alert.alert(STRINGS.SUCCESS, STRINGS.READING_PROGRESS_RESET_SUCCESSFULLY);
            } catch (error) {
              Alert.alert(STRINGS.ERROR, STRINGS.FAILED_TO_RESET_READING_PROGRESS);
              handleError(error as Error, { showToast: false });
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [user?.id, queryClient]);

  const handleReminderToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        try {
          // Ensure we have notification permissions when enabling notifications
          const { ensurePermissions } = await import('@/services/notificationService');
          const granted = await ensurePermissions();
          setNotificationPermissions(granted);

          if (!granted) {
            Alert.alert(STRINGS.ENABLE_NOTIFICATIONS, STRINGS.TURN_ON_NOTIFICATIONS, [
              { text: UiAction.CANCEL, style: 'cancel' },
              { text: STRINGS.OPEN_SETTINGS, onPress: () => Linking.openSettings() },
            ]);
            return;
          }
        } catch (error) {
          handleError(error as Error, { showToast: false });
          Alert.alert(STRINGS.ENABLE_NOTIFICATIONS, STRINGS.TURN_ON_NOTIFICATIONS, [
            { text: UiAction.CANCEL, style: 'cancel' },
            { text: STRINGS.OPEN_SETTINGS, onPress: () => Linking.openSettings() },
          ]);
          return;
        }
      }

      const newReminderTime = { ...reminderTime, enabled };
      await updateReminderTime(newReminderTime);
      lightFeedback();
    },
    [reminderTime, updateReminderTime],
  );

  useEffect(() => {
    const checkNotificationPermissions = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const permissionsGranted = status === 'granted';
        if (isMounted.current) {
          setNotificationPermissions(permissionsGranted);
        }
      } catch (error) {
        handleError(error as Error, { showToast: false });
        if (isMounted.current) {
          setNotificationPermissions(false);
        }
      }
    };

    checkNotificationPermissions();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleTimePickerOpen = useCallback(() => {
    setShowTimePicker(true);
  }, []);

  const handleTimePickerClose = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimeSet = useCallback(
    async (hour: number, minute: number) => {
      const newReminderTime = { ...reminderTime, hour, minute };
      await updateReminderTime(newReminderTime);
      lightFeedback();
    },
    [reminderTime, updateReminderTime],
  );

  const handleSupportContact = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FEEDBACK);
  }, []);

  const handleRequestReview = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      handleError(error as Error, {
        analyticsEventName: 'Store_Review_Request_Failed',
        sentryTags: { location: 'account', action: 'store_review' },
        sentryExtra: { hasAction: await StoreReview.hasAction() },
        showToast: false, // Silent failure for store review
        sentrySeverity: 'info', // Not critical, just informational
      });
    }
  }, []);

  const appVersion = pkg.version;
  const currentYear = new Date().getFullYear();

  const result = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  return result;
};

export type UseAccountScreenReturn = ReturnType<typeof useAccountScreen>;
