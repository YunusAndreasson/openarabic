import * as MailComposer from 'expo-mail-composer';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Alert, Linking } from 'react-native';

import { useAudioCache } from '@/hooks/audio/useAudioCache';
import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import pkg from '@/package.json';
import { supabase } from '@/services/supabase';
import { formatBytes } from '@/utils/cacheUtils';
import { handleError } from '@/utils/errorHandling';
import { lightFeedback } from '@/utils/haptics';

// import { analytics } from '@/services/analytics';
// Temporary mock analytics until service is fixed
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
            'No Cache',
            `There is no ${
              type === 'audio' ? 'cached audio files' : 'offline data cache'
            } to clear.`
          );
          return;
        }

        Alert.alert(
          title,
          `${description} ${formatBytes(size)} of cached data. ${
            type === 'audio'
              ? "You'll need to re-download audio when playing articles."
              : 'The app will need to reload this data when you use it again.'
          }`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Clear Cache',
              style: 'destructive',
              onPress: async () => {
                setIsClearingCache(true);
                try {
                  await clearFunction();
                  setSizeFunction(0);
                  lightFeedback();
                  Alert.alert(
                    'Success',
                    `${type === 'audio' ? 'Audio' : 'Offline data'} cache cleared successfully`
                  );
                } catch (error) {
                  Alert.alert(
                    'Error',
                    `Failed to clear ${type === 'audio' ? 'audio' : 'offline data'} cache`
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
        'Clear Audio Cache',
        'This will delete'
      ),
    [createCacheClearHandler, cacheSize, clearCache]
  );

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await analytics.trackSignOut();
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', error.message);
                return;
              }
              await analytics.reset();
              router.replace('/auth');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
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
        Alert.alert('Enable Notifications', 'Turn on notifications to get daily study reminders.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Settings',
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
    router.push('/(tabs)/read/account/learningMethod');
  }, []);

  const handleClassicalTextsPress = useCallback(() => {
    router.push('/(tabs)/read/account/classicalTexts');
  }, []);

  const handleFontSelectorPress = useCallback(() => {
    router.push('/(tabs)/read/account/font-selector');
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
