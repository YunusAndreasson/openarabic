import * as MailComposer from 'expo-mail-composer';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Alert, Linking } from 'react-native';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAudioCache } from '@/hooks/audio/useAudioCache';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import pkg from '@/package.json';
import { supabase } from '@/services/supabase';
import { formatBytes } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

const analytics = {
  trackSignOut: async () => {},
  reset: async () => {},
};

export const useAccountScreen = () => {
  const { reminderTime, updateReminderTime, formatReminderTime } = useReminders();
  const { clearCache, getCacheSize } = useAudioCache();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermissions, setNotificationPermissions] = useState(false);
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

  // Consolidated cache clearing logic
  const createCacheClearHandler = useCallback(
    (
      type: 'audio' | 'query',
      size: number,
      clearFunction: () => Promise<void>,
      setSizeFunction: (size: number) => void,
      title: string,
      description: string
    ) => {
      return () => {
        if (size === 0) {
          Alert.alert(
            STRINGS.NO_CACHE,
            type === 'audio'
              ? STRINGS.NO_CACHED_AUDIO_FILES_TO_CLEAR
              : STRINGS.NO_OFFLINE_DATA_CACHE_TO_CLEAR
          );
          return;
        }

          Alert.alert(
            title,
            `${description} ${formatBytes(size)} of cached data. ${
              type === 'audio'
                ? STRINGS.AUDIO_REDOWNLOAD_REQUIRED
                : STRINGS.DATA_RELOAD_REQUIRED
            }`,
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
                  await clearFunction();
                  setSizeFunction(0);
                  lightFeedback();
                  Alert.alert(
                    STRINGS.SUCCESS,
                    `${
                      type === 'audio'
                        ? STRINGS.AUDIO_CACHE_CLEARED_SUCCESSFULLY
                        : STRINGS.OFFLINE_DATA_CACHE_CLEARED_SUCCESSFULLY
                    }`
                  );
                } catch (error) {
                  Alert.alert(
                    STRINGS.ERROR,
                    `${
                      type === 'audio'
                        ? STRINGS.FAILED_TO_CLEAR_AUDIO_CACHE
                        : STRINGS.FAILED_TO_CLEAR_OFFLINE_CACHE
                    }`
                  );
                  handleError(error as Error, { showToast: false });
                } finally {
                  setIsClearingCache(false);
                }
              },
            },
          ]
        );
      };
    },
    []
  );

  const handleClearCache = useMemo(
    () =>
      createCacheClearHandler(
        'audio',
        cacheSize,
        clearCache,
        setCacheSize,
        STRINGS.CLEAR_AUDIO_CACHE,
        STRINGS.THIS_WILL_DELETE
      ),
    [createCacheClearHandler, cacheSize, clearCache]
  );

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
      if (enabled && !notificationPermissions) {
        Alert.alert(
          STRINGS.ENABLE_NOTIFICATIONS,
          STRINGS.TURN_ON_NOTIFICATIONS,
          [
          { text: STRINGS.CANCEL, style: 'cancel' },
          {
            text: STRINGS.SETTINGS,
            onPress: () => {
              Linking.openSettings();
            },
          },
        ]);
        return;
      }

      const newReminderTime = { ...reminderTime, enabled };
      await updateReminderTime(newReminderTime);
      lightFeedback();
    },
    [reminderTime, updateReminderTime, notificationPermissions]
  );

  useEffect(() => {
    const checkNotificationPermissions = async () => {
      try {
        const { hasPermissions } = await import('@/services/notificationService');
        const permissionsGranted = await hasPermissions();
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
        Linking.openURL('mailto:yunus@edenmind.com');
        return;
      }

      // Compose email with pre-filled information
      const result = await MailComposer.composeAsync({
        recipients: ['yunus@edenmind.com'],
        subject: 'Open Arabic App Support',
        body: `Hi there,

I need help with the Open Arabic app.

App Version: ${pkg.version}
User Email: ${user?.email || 'Not signed in'}

Please describe your issue below:

`,
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
      Linking.openURL('mailto:yunus@edenmind.com');
    }
  }, [user?.email]);

  const handleSocialLink = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const handleLearningMethodPress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_LEARNING_METHOD);
  }, []);

  const handleClassicalTextsPress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_CLASSICAL_TEXTS);
  }, []);

  const handleFontSelectorPress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FONT_SELECTOR);
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
      handleSocialLink,
      handleLearningMethodPress,
      handleClassicalTextsPress,
      handleFontSelectorPress,
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
      handleSocialLink,
      handleLearningMethodPress,
      handleClassicalTextsPress,
      handleFontSelectorPress,
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
