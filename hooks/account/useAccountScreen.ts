import { useQueryClient } from '@tanstack/react-query';
import * as MailComposer from 'expo-mail-composer';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAudioCache } from '@/hooks/audio/useAudioCache';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import pkg from '@/package.json';
import { analytics } from '@/services/analytics';
import { supabase } from '@/services/supabase';
import { formatBytes } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

export const useAccountScreen = () => {
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const { clearCache, getCacheSize } = useAudioCache();
  const queryClient = useQueryClient();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [, setNotificationPermissions] = useState(false);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const { user } = useAuth();
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

  // Generic cache clearing function that clears both audio and query caches
  const handleClearCache = useCallback(async () => {
    if (cacheSize === 0) {
      Alert.alert(STRINGS.NO_CACHE, STRINGS.NO_CACHED_FILES);
      return;
    }

    Alert.alert(
      STRINGS.CLEAR_CACHE,
      `${STRINGS.THIS_WILL_DELETE} ${formatBytes(cacheSize)} of cached data. ${
        STRINGS.AUDIO_REDOWNLOAD_REQUIRED
      } ${STRINGS.DATA_RELOAD_REQUIRED}`,
      [
        {
          text: STRINGS.CANCEL,
          style: 'cancel',
        },
        {
          text: STRINGS.CLEAR_CACHE,
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              // Clear audio cache
              await clearCache();
              setCacheSize(0);

              // Clear React Query cache
              queryClient.clear();

              lightFeedback();
              Alert.alert(STRINGS.SUCCESS, STRINGS.CACHE_CLEARED_SUCCESSFULLY);
            } catch (error) {
              Alert.alert(STRINGS.ERROR, STRINGS.FAILED_TO_CLEAR_OFFLINE_CACHE);
              handleError(error as Error, { showToast: false });
            } finally {
              setIsClearingCache(false);
            }
          },
        },
      ]
    );
  }, [cacheSize, clearCache, queryClient]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      STRINGS.SIGN_OUT,
      STRINGS.ARE_YOU_SURE_SIGN_OUT,
      [
        {
          text: STRINGS.CANCEL,
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
                error instanceof Error ? error.message : STRINGS.FAILED_TO_SIGN_OUT
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, []);

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
              { text: STRINGS.CANCEL, style: 'cancel' },
              { text: STRINGS.OPEN_SETTINGS, onPress: () => Linking.openSettings() },
            ]);
            return;
          }
        } catch (error) {
          handleError(error as Error, { showToast: false });
          Alert.alert(STRINGS.ENABLE_NOTIFICATIONS, STRINGS.TURN_ON_NOTIFICATIONS, [
            { text: STRINGS.CANCEL, style: 'cancel' },
            { text: STRINGS.OPEN_SETTINGS, onPress: () => Linking.openSettings() },
          ]);
          return;
        }
      }

      const newReminderTime = { ...reminderTime, enabled };
      await updateReminderTime(newReminderTime);
      lightFeedback();
    },
    [reminderTime, updateReminderTime]
  );

  useEffect(() => {
    const checkNotificationPermissions = async () => {
      try {
        const { default: Notifications } = await import('expo-notifications');
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
    },
    [reminderTime, updateReminderTime]
  );

  const handleSupportContact = useCallback(async () => {
    try {
      // Check if mail composer is available
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        // Fallback to mailto link if mail composer is not available
        Linking.openURL(`mailto:${STRINGS.SUPPORT_EMAIL}`);
        return;
      }

      // Compose email with pre-filled information
      const result = await MailComposer.composeAsync({
        recipients: [STRINGS.SUPPORT_EMAIL],
        subject: STRINGS.SUPPORT_EMAIL_SUBJECT,
        body: STRINGS.SUPPORT_EMAIL_BODY_TEMPLATE.replace('{version}', pkg.version).replace(
          '{email}',
          user?.email || STRINGS.NO_EMAIL
        ),
        isHtml: false,
      });

      // Handle the result if needed
      if (result.status === MailComposer.MailComposerStatus.SENT) {
        lightFeedback();
      }
    } catch (error) {
      // Fallback to mailto link if there's an error
      handleError(error as Error, {
        showToast: false,
        analyticsEventName: 'Mail_Composer_Error',
      });
      Linking.openURL(`mailto:${STRINGS.SUPPORT_EMAIL}`);
    }
  }, [user?.email]);

  const handleFontSelectorPress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FONT_SELECTOR);
  }, []);

  const handleRequestReview = useCallback(async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      }
    } catch (error) {
      console.warn('Store review request failed:', error);
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
      handleSupportContact,
      handleFontSelectorPress,
      handleRequestReview,
      appVersion,
      currentYear,
      user,
      handleClearCache,
      isClearingCache,
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
      handleSupportContact,
      handleFontSelectorPress,
      handleRequestReview,
      appVersion,
      currentYear,
      user,
      handleClearCache,
      isClearingCache,
      cacheSize,
    ]
  );

  return result;
};

export type UseAccountScreenReturn = ReturnType<typeof useAccountScreen>;
