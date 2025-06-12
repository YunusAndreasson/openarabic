import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { useAuth } from '@/hooks/auth/useAuth';
import { useReminders } from '@/hooks/notifications/useReminders';
import pkg from '@/package.json';
import { supabase } from '@/services/supabase';
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationPermissions, setNotificationPermissions] = useState(false);
  const { user } = useAuth();

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
        setNotificationPermissions(permissionsGranted);
      } catch (error) {
        handleError(error as Error, { showToast: false });
        setNotificationPermissions(false);
      }
    };

    checkNotificationPermissions();
  }, []);

  const handleTimePickerOpen = useCallback(() => {
    setShowTimePicker(true);
    lightFeedback();
  }, []);

  const handleTimePickerClose = useCallback(() => {
    setShowTimePicker(false);
  }, []);

  const handleTimeSet = useCallback(
    async (hour: number, minute: number) => {
      const newReminderTime = { ...reminderTime, hour, minute };
      await updateReminderTime(newReminderTime);
      setShowTimePicker(false);
      lightFeedback();
    },
    [reminderTime, updateReminderTime]
  );

  const handleSupportContact = useCallback(() => {
    Linking.openURL('mailto:yunus@edenmind.com');
  }, []);

  const handleSocialLink = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const handleLearningMethodPress = useCallback(() => {
    router.push('/(tabs)/read/account/learningMethod');
  }, []);

  const handleClassicalTextsPress = useCallback(() => {
    router.push('/(tabs)/read/account/classicalTexts');
  }, []);

  const appVersion = pkg.version;
  const currentYear = new Date().getFullYear();

  return {
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
    appVersion,
    currentYear,
    user,
  };
};

export type UseAccountScreenReturn = ReturnType<typeof useAccountScreen>;
