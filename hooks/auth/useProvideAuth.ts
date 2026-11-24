import type * as Lifecycle from '@/services/accountLifecycle';
import { widgetBridge } from '@/services/widgets/native';
import { markReturningInstall } from '@/store/firstPageSlice';
import { restoreWidgetSession } from '@/services/widgets/publish';
import * as Sentry from '@sentry/react-native';
import { useEffect, useEffectEvent, useState, useMemo, useCallback } from 'react';

import { supabase, setupSupabaseAppStateListener } from '@/services/supabase';
import { useAppDispatch } from '@/store/hooks';
import { accountSwitched } from '@/store/accountActions';
import type { AuthResult, UserSession } from '@/types/auth.types';
import { claimDeviceForAccount } from '@/utils/accountSwitch';
import { authBreadcrumb, handleError } from '@/utils/errorHandling';

// UserSession and AuthResult types are defined in '@/types/auth.types'

function acceptSession(owner: string, signedIn = false) {
  const { accountTeardown } = require('@/services/accountLifecycle') as typeof Lifecycle;
  return accountTeardown.acceptSession(owner, signedIn);
}

export function useProvideAuth(): AuthResult {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // The store's own dispatch, so it keeps one identity for the life of the
  // app — which is what keeps `claimDevice`, `initAuth` and the auth
  // subscription below from being torn down and re-created.
  const dispatch = useAppDispatch();
  const expireAccount = useEffectEvent(() => {
    const owner = session?.user?.id;
    if (owner) {
      const { accountTeardown } = require('@/services/accountLifecycle') as typeof Lifecycle;
      void accountTeardown.begin(owner, 'expired').catch(() => undefined);
    }
  });

  // Called whenever a session is established, and AWAITED before that session
  // is published. A no-op unless a different account last used this device —
  // see claimDeviceForAccount. Publishing first let the new account's screens
  // read the previous account's streak and pacing data in the gap before the
  // sweep landed, and write the merged result back under their own name.
  // Never rejects: a failed sweep must not keep anyone signed out.
  const claimDevice = useCallback(
    async (userId: string): Promise<void> => {
      try {
        if (await claimDeviceForAccount(userId)) dispatch(accountSwitched());
      } catch (error) {
        void handleError(error, {
          showToast: false,
          analyticsEventName: 'Account_Switch_Cleanup_Error',
        });
      }
    },
    [dispatch],
  );

  // Perform initial auth setup
  const initAuth = useCallback(
    async (isCurrent: () => boolean) => {
      try {
        authBreadcrumb('Starting auth initialization');

        // Modern supabase-js v2 auto-initializes on first use
        // Auto-refresh is enabled with autoRefreshToken: true in client config
        const { data, error } = await supabase.auth.getSession();

        if (!isCurrent()) return;
        if (error) {
          Sentry.captureException(error, {
            tags: { location: 'auth_init_get_session' },
            level: 'error',
          });
          setSession(null);
        } else if (data.session) {
          authBreadcrumb('Successfully initialized with valid session');
          if (await acceptSession(data.session.user.id)) {
            await claimDevice(data.session.user.id);
            if (!isCurrent()) return;
            restoreWidgetSession(data.session.user.id);
            widgetBridge?.openPublications(data.session.user.id);
            setSession(data.session);
          }
        } else {
          authBreadcrumb('Initialized but no valid session found');
          setSession(null);
        }
      } catch (error) {
        void handleError(error, {
          analyticsEventName: 'Auth_Initialization_Failed',
          sentrySeverity: 'error',
          showToast: false,
        });
        if (isCurrent()) setSession(null);
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [claimDevice],
  );

  useEffect(() => {
    // The supabase service's AppState listener starts/stops the auth-js
    // auto-refresh ticker on foreground/background; startAutoRefresh fires an
    // immediate refresh tick on activation, and the resulting TOKEN_REFRESHED
    // events arrive through onAuthStateChange below — no foreground
    // getSession() polling needed here.
    const removeSupabaseListener = setupSupabaseAppStateListener();
    let isMounted = true;
    // Counts handled auth events, so a deferred publish can tell it was overtaken.
    let authEventSeq = 0;

    // Initialize auth — async session fetch that must run once on mount; setState
    // happens after awaited supabase call resolves, not synchronously in effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initAuth(() => isMounted && authEventSeq === 0);

    // Listen for auth state changes
    // CRITICAL: Callback must NOT be async and should defer all operations to prevent deadlocks
    // See: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (
        !isMounted ||
        !(
          event === 'SIGNED_OUT' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'PASSWORD_RECOVERY' ||
          event === 'USER_UPDATED'
        )
      )
        return;
      // A session-less refresh/update has nothing to publish. Leave the
      // pending startup read or account claim in charge of loading state.
      if (event !== 'SIGNED_OUT' && !newSession) return;
      if (event === 'SIGNED_OUT') {
        expireAccount();
      }
      const eventSeq = ++authEventSeq;

      // Defer auth, account cleanup and diagnostics outside the SDK lock.
      setTimeout(() => {
        // FIXED: Guard against race condition where component unmounts between setTimeout queue and execution
        if (!isMounted) return;

        authBreadcrumb(`Auth state change: ${event}`);

        if (event === 'SIGNED_OUT' && eventSeq === authEventSeq) {
          dispatch(markReturningInstall());
          setSession(null);
          setIsLoading(false);
        } else if (newSession && authEventSeq === eventSeq) {
          authBreadcrumb('New session received, updating state');
          // Publish only once the claim has settled, and only if no later
          // auth event overtook it while it ran — that one has already
          // published the state this would now be overwriting.
          const isCurrent = () => isMounted && authEventSeq === eventSeq;
          void acceptSession(newSession.user.id, event === 'SIGNED_IN')
            .then(async accepted => {
              if (!isCurrent()) return;
              if (!accepted) {
                setSession(null);
                setIsLoading(false);
                return;
              }
              await claimDevice(newSession.user.id);
              if (!isCurrent()) return;
              widgetBridge?.openPublications(newSession.user.id);
              restoreWidgetSession(newSession.user.id);
              setSession(newSession);
              setIsLoading(false);
            })
            .catch((error: unknown) => {
              if (isMounted && authEventSeq === eventSeq) {
                setSession(null);
                setIsLoading(false);
              }
              void handleError(error, { showToast: false });
            });
        }
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      removeSupabaseListener();
    };
  }, [initAuth, claimDevice, dispatch]);

  // Memoize the returned object to ensure reference stability
  const authResult = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthenticated: !!session?.user,
    }),
    [session, isLoading],
  );

  return authResult;
}
