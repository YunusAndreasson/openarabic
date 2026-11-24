import type { AuthError } from '@supabase/supabase-js';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { audioCache } from '@/services/audioCache';
import { purgeVoiceHotwords } from '@/services/voiceHotwordFiles';
import { STORAGE_KEYS, accountOwnedStorageKeys } from '@/constants/storageKeys';
import { initialFace } from '@/constants/widgetEdition';
import { createAccountTeardown } from '@/services/accountTeardown';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import { removeFeedbackScreenshots } from '@/services/feedbackScreenshots';
import { cancelAccountNotifications } from '@/services/notificationService';
import { readerSave } from '@/services/readerSave';
import { purgeReminderDetail } from '@/services/reviewReminderJourney';
import { supabase } from '@/services/supabase';
import { clearWordWidget } from '@/services/widgets/publish';
import { submitPublicWidget } from '@/services/widgets/publicHost';
import { handleError } from '@/utils/errorHandling';
import { resetNotificationPromptState } from '@/utils/notificationPromptStorage';

let resetApplicationState: (() => Promise<void>) | undefined;
export function registerAccountStorageReset(reset: () => Promise<void>) {
  resetApplicationState = reset;
}

// Only definitive auth responses can reconcile an unacknowledged DELETE.
// An offline or server-side refresh failure can still belong to a live account.
function endedSession(error: AuthError | null) {
  return (
    !!error &&
    (error.name === 'AuthSessionMissingError' ||
      (error.name === 'AuthApiError' && error.status === 401) ||
      [
        'user_not_found',
        'session_not_found',
        'session_expired',
        'bad_jwt',
        'refresh_token_not_found',
        'refresh_token_already_used',
      ].includes(error.code ?? ''))
  );
}

export const accountTeardown = createAccountTeardown(
  AsyncStorage,
  {
    revokeWidgetGeneration: owner => {
      clearWordWidget(owner, 'revoke');
    },
    notifications: owner => cancelAccountNotifications(owner),
    async widget(owner) {
      // A headless writer may have stored its old snapshot while draining.
      clearWordWidget(owner);
      await submitPublicWidget('WordInContext', initialFace.arabic);
    },
    async storage(owner) {
      await simpleAudioService.stop();
      await resetApplicationState?.();
      resetNotificationPromptState();
      await readerSave.clearOwner(owner);
      await purgeReminderDetail(owner);
      await AsyncStorage.multiRemove(accountOwnedStorageKeys(owner));
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SIGNED_IN_USER);
      await audioCache.clearLearnerCache();
      await purgeVoiceHotwords();
    },
    async finish(owner, mode) {
      const { data, error } = await supabase.auth.getSession();
      if (error && !(mode === 'delete' && endedSession(error))) throw error;
      if (data.session && data.session.user.id !== owner) return;
      if (data.session && mode !== 'expired') {
        const ended =
          mode === 'delete'
            ? await supabase.auth.signOut({ scope: 'local' })
            : await supabase.auth.signOut();
        if (ended.error && !(mode === 'delete' && endedSession(ended.error))) {
          if (mode === 'delete')
            throw new Error(
              `Account was deleted but the local session could not be cleared: ${ended.error.message}`,
            );
          throw ended.error;
        }
        if (mode === 'signOut') await analytics.trackSignOut();
      }
      if (mode === 'delete')
        await analytics.track(ANALYTICS_EVENTS.ACCOUNT_DELETED, {
          timestamp: new Date().toISOString(),
        });
      await analytics.reset();
    },
  },
  {
    async session(owner) {
      const { data, error } = await supabase.auth.getSession();
      if (data.session && data.session.user.id !== owner) return 'sessionSwitched';
      if (endedSession(error)) return 'sessionExpired';
      if (error) throw error;
      if (!data.session) return 'sessionMissing';
      return { token: data.session.access_token };
    },
    async identity(owner) {
      const { data, error } = await supabase.auth.getUser();
      if (endedSession(error)) return 'sessionExpired';
      if (error) throw error;
      return data.user.id === owner ? 'sessionValid' : 'sessionSwitched';
    },
    async prepare(owner) {
      try {
        await removeFeedbackScreenshots(owner);
      } catch (cause) {
        void handleError(cause, {
          showToast: false,
          analyticsEventName: 'Account_Deletion_Screenshot_Cleanup_Error',
          sentryTags: { location: 'account_deletion_screenshot_cleanup' },
        });
      }
    },
    async send(owner, token) {
      const result = await supabase
        .rpc('delete_user_account', { user_id: owner })
        .setHeader('Authorization', 'Bearer ' + token);
      if (!result.error) return { event: 'rpcOk' };
      // Postgrest-js also returns transport failures as results (status 0).
      const transient =
        result.status === 0 ||
        result.status === 408 ||
        result.status === 429 ||
        result.status >= 500;
      return {
        event: transient ? 'rpcLost' : 'rpcError',
        error: new Error(`Failed to delete account: ${result.error.message}`),
      };
    },
  },
);
