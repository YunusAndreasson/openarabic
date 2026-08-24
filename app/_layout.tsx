import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  useNavigationContainerRef,
  useRouter,
} from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { memo, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import amiriFont from '@/assets/fonts/Amiri.ttf';
import madinaFont from '@/assets/fonts/Madina.otf';
import nastaliqFont from '@/assets/fonts/Nastaliq.ttf';
import notoSansFont from '@/assets/fonts/NotoSans.ttf';
import scheherazadeFont from '@/assets/fonts/Scheherazade.ttf';
import interRegular from '@/assets/fonts/Inter-Regular.ttf';
import interSemiBold from '@/assets/fonts/Inter-SemiBold.ttf';
import interBold from '@/assets/fonts/Inter-Bold.ttf';
import { AudioErrorBoundary, GlobalMiniPlayer } from '@/components/audio';
import { AppErrorFallback } from '@/components/common';
import {
  AuthProvider,
  FSRSDataProvider,
  ToastProvider,
  TutorialProvider,
  VoiceGradingProvider,
} from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { Theme } from '@/constants/colors';
import { NOTIFICATION_ROUTE_BY_TYPE, NOTIFICATION_TYPES } from '@/constants/notifications';
import type { AnyNotificationType } from '@/constants/notifications';
import { QUERY_DEFAULTS, studyStreakQueries } from '@/constants/queries';
import { useAppBadge } from '@/hooks/app/useAppBadge';
import { useSmartNotifications } from '@/hooks/notifications/useSmartNotifications';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { GlobalAudioStateProvider } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useSystemUITheme } from '@/hooks/theme/useSystemUITheme';
import { useSmartDueWordsCalculator } from '@/hooks/vocabulary/useSmartDueWordsCalculator';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import { registerBackgroundTasks, unregisterBackgroundTasks } from '@/services/backgroundTasks';
import {
  cleanupNotifications,
  clearAppBadge,
  clearNotificationNavigationCallback,
  initializeNotifications,
  setNotificationNavigationCallback,
} from '@/services/notificationService';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { persistor, store } from '@/store/store';
import { setTheme } from '@/store/themeSlice';
import { handleError } from '@/utils/errorHandling';
import { registerMutationDefaults } from '@/utils/mutationDefaults';
import { createNavigationOptions, createSheetOptions } from '@/utils/navigation';
import { flushPersistedQueryCache, PERSISTENCE_OPTIONS } from '@/utils/queryPersistence';
import { flushPendingSheetNavigation } from '@/utils/sheetNavigation';
import type * as NotificationsModule from 'expo-notifications';

// expo-notifications is unavailable in Expo Go on Android (SDK 53+).
let Notifications: typeof NotificationsModule | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications unavailable in Expo Go on Android (SDK 53+)
}

// The expo-font config plugin (app.json) embeds all fonts natively on both
// platforms, so useFonts gets an empty map that resolves immediately and the
// splash-hide path skips a redundant font resolve.
//   iOS     — string entries register under their PostScript names, which are
//             exactly the names the app references.
//   Android — the `android.fonts` object entries register under the declared
//             `fontFamily` verbatim, via ReactFontManager.addCustomFont() in
//             MainApplication.onCreate(), i.e. before JS starts. (String entries
//             would instead register under the FILENAME — 'NotoSans.ttf' →
//             'NotoSans' — which is why the object form is required there.)
// Expo Go runs no config plugins, so it is the only case still needing the
// runtime load.
//
// NOTE: this is an app.json plugin change, so it only takes effect after a
// native rebuild — an OTA alone will ship the narrowed flag without the fonts.
const NEEDS_RUNTIME_FONTS = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const RUNTIME_FONT_MAP = {
  'NotoSansArabic-Regular': notoSansFont,
  'Amiri-Regular': amiriFont,
  DigitalKhattNewMadinaRegular: madinaFont,
  'ScheherazadeNew-Regular': scheherazadeFont,
  'NotoNastaliqUrdu-Regular': nastaliqFont,
  'Inter-Regular': interRegular,
  'Inter-SemiBold': interSemiBold,
  'Inter-Bold': interBold,
};

// Keep the splash screen visible while we fetch resources.
// Returns a promise; a rejection here would be an unhandled rejection at startup
// (and the splash is hidden explicitly once resources resolve regardless).
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash already hidden / unavailable — nothing to recover.
});

// Smooth fade-out transition when hiding the splash screen
SplashScreen.setOptions({ fade: true, duration: 400 });

// Sync React Query online status with device connectivity
onlineManager.setEventListener((setOnline: (online: boolean) => void) => {
  return NetInfo.addEventListener((state: NetInfoState) => {
    setOnline(Boolean(state.isConnected));
  });
});
NetInfo.fetch()
  .then((state: NetInfoState) => onlineManager.setOnline(Boolean(state.isConnected)))
  .catch(() => {
    // A rejection here would be an unhandled rejection at startup; the
    // onlineManager listener above covers the steady state.
  });

// Optimized retry logic that stops when offline
const createRetryFunction = (maxRetries: number) => (failureCount: number, error: unknown) => {
  if (!onlineManager.isOnline()) return false;
  // Don't retry on 4xx errors (client errors)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status >= 400 && status < 500) return false;
  }
  return failureCount < maxRetries;
};

// Move queryClient outside component scope for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_DEFAULTS.STALE_TIME,
      gcTime: QUERY_DEFAULTS.GC_TIME,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // Disable for mobile
      networkMode: 'online',
      retry: createRetryFunction(QUERY_DEFAULTS.MAX_RETRIES),
      retryDelay: attemptIndex =>
        Math.min(1000 * 2 ** attemptIndex, QUERY_DEFAULTS.MAX_RETRY_DELAY),
    },
    mutations: {
      retry: createRetryFunction(QUERY_DEFAULTS.MUTATION_MAX_RETRIES),
      networkMode: 'online',
      gcTime: 0, // Don't cache mutation results
    },
  },
});

// Must run before PersistQueryClientProvider's restore effect (first mount)
// sees a rehydrated mutation — see registerMutationDefaults' own comment for
// why a mutation resumed with no registered default fails outright.
registerMutationDefaults(queryClient);

// A mutation paused offline (networkMode 'online') is dehydrated with the rest
// of the persisted cache on app close. Without resuming it here, it stays
// dormant forever after a restart — the write it represents (e.g. a review
// grade) is silently lost instead of firing the moment the app comes back up
// with a connection.
//
// `onlineManager` defaults to online (`#online = true`, query-core) until the
// first real NetInfo signal arrives, and that arrives asynchronously — a
// cold start reliably wins this race, restoring and resuming before the
// bridge round trip resolves. Resuming against that stale "online" default
// on a connection that isn't genuinely up yet fails the mutation outright,
// and with `gcTime: 0` on mutations it is garbage-collected the moment it
// settles — gone before the real connection comes up moments later. A fresh,
// awaited check closes that window; if it turns out we're still offline the
// mutation simply stays paused, exactly as intended.
const resumePausedMutationsOnRestore = (): void => {
  NetInfo.fetch()
    .then((state: NetInfoState) => {
      onlineManager.setOnline(Boolean(state.isConnected));
      return queryClient.resumePausedMutations();
    })
    .catch(() => {
      // Fall back to whatever onlineManager already believes — better than
      // never attempting the resume at all.
      void queryClient.resumePausedMutations();
    });
};

// Memoize navigation integration for Sentry
const navigationIntegration = Sentry.reactNavigationIntegration();
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Initialize Sentry with production config
Sentry.init({
  dsn: sentryDsn,
  integrations: [
    navigationIntegration,
    Sentry.feedbackIntegration({
      // User-friendly configuration for issue reporting
      colorScheme: 'system', // Match app theme (light/dark)
      enableScreenshot: false, // Disable screenshot for now (troubleshooting)
      isEmailRequired: false, // Email is optional (we can pre-fill from auth)
      isNameRequired: false, // Name is optional
      showEmail: true, // Show email field
      showName: true, // Show name field
      formTitle: 'Report an Issue',
      submitButtonLabel: 'Send Report',
      messagePlaceholder: 'What happened? How can we help?',
      // Additional context (user email, app version, etc.) will be added via setContext() when widget opens
    }),
  ],
  enabled: !!sentryDsn, // Only enable if DSN is available
  tracesSampleRate: __DEV__ ? 1.0 : 0.1, // Sample everything in dev; 10% in production (Sentry guidance: don't ship 1.0)
  attachScreenshot: true, // Helps debug UI crashes
  debug: false, // Disable Sentry debug logging for performance
  enableNative: true, // CRITICAL: Enable native crash reporting
  enableNativeCrashHandling: true, // Catch native crashes
  enableAutoSessionTracking: true, // Track sessions

  beforeSend(event) {
    // Add environment diagnostic context to all events
    event.contexts = {
      ...event.contexts,
      env_vars: {
        sentry_dsn_present: !!sentryDsn,
        sentry_dsn_length: sentryDsn?.length || 0,
        mixpanel_token_present: !!process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
        google_web_client_id_present: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        google_ios_client_id_present: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      },
    };
    return event;
  },
});

// Correlate Sentry events with the OTA update they ran on, so a bad release shows up
// as a single tag-filterable cohort instead of having to cross-reference build numbers.
Sentry.setTag('expo_update_id', Updates.updateId ?? 'embedded');
Sentry.setTag('expo_update_channel', Updates.channel ?? 'unknown');
Sentry.setTag('expo_update_runtime_version', Updates.runtimeVersion ?? 'unknown');
Sentry.setTag('expo_update_is_embedded', String(Updates.isEmbeddedLaunch));

function AppContent() {
  const dispatch = useAppDispatch();
  const theme = useAppSelectorShallow((state: RootState) => state.theme.theme);
  const isDark = theme === Theme.Dark;
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const [sessionStartTime] = useState<number>(() => Date.now());
  const backgroundedTime = useRef<number | null>(null);
  const resumeRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isLoading: isAuthLoading, session } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();

  // Runtime font load for Expo Go + Android — see RUNTIME_FONT_MAP above
  const [fontsLoaded, fontError] = useFonts(NEEDS_RUNTIME_FONTS ? RUNTIME_FONT_MAP : {});

  // A font failure must not strand the user on the splash screen forever, so
  // it is reported and then treated as resolved — the app falls back to system
  // fonts rather than never starting.
  useEffect(() => {
    if (fontError) {
      handleError(fontError, {
        showToast: false,
        analyticsEventName: 'Font_Load_Failed',
        sentryTags: { location: 'app', action: 'font_load' },
      });
    }
  }, [fontError]);

  // Centralized system UI theme management
  useSystemUITheme();

  // App badge management - monitors due words and updates app icon badge
  useAppBadge();

  // Smart SRS reminders - keeps the scheduled notification plan in sync with FSRS state
  useSmartNotifications();

  // Smart due words calculator - refreshes data when app becomes active
  useSmartDueWordsCalculator({
    refreshDelay: 1000, // 1 second delay to avoid excessive API calls
  });

  const { preloadAppData, isLoaded } = useAppPreloader();
  const hasTriggeredPreload = useRef(false);

  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef);
      // Also register for performance route tracking used by rerender logger
    }
  }, [navigationRef]);

  // Configure Android navigation bar button style (background is transparent in
  // edge-to-edge mode). Own effect with isDark in deps so bar contrast follows
  // theme changes — kept separate from the session effect below, whose
  // analytics.identify / audio-session work must not re-run on a theme switch.
  useEffect(() => {
    if (!appReady || isAuthLoading) return;

    if (Platform.OS === 'android') {
      NavigationBar.setStyle(isDark ? 'light' : 'dark');
    }
  }, [appReady, isAuthLoading, isDark]);

  useEffect(() => {
    if (!appReady || isAuthLoading) return;

    // Pre-configure audio session for background playback (call service directly to avoid subscribing to audio state).
    // configureAudioSession() REJECTS when iOS refuses to activate the session —
    // OSStatus 561017449 ('!pla', cannot-start-playing), which happens legitimately
    // when the app is launched into the background or during a call. Unhandled, that
    // rejection was the #2 production error. It is not fatal: play() reconfigures the
    // session on the real playback path and reports there if it still fails.
    simpleAudioService.preconfigureAudioSession().catch(() => {
      // Pre-warm only — the playback path retries and owns real error reporting.
    });

    const identifyUser = async () => {
      if (session?.user) {
        try {
          await analytics.identify(session.user.id, {
            last_active: new Date().toISOString(),
          });
        } catch (err) {
          // Silently ignore analytics errors
          handleError(err, { showToast: false });
        }
      }
    };

    identifyUser();
  }, [session, appReady, isAuthLoading]);

  const colors = useColors();

  // Optimized navigation theme - memoize with stable colors reference.
  // `card` drives the iOS navigation bar's standardAppearance background.
  // Setting it to the screen background means tab roots can leave
  // `headerStyle.backgroundColor` unset and inherit the right color — which in
  // turn keeps scrollEdgeAppearance at the iOS default (transparent) so the bar
  // fades from transparent to opaque as content scrolls under the large title.
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.tint,
        card: colors.background,
        background: colors.background,
      },
    };
  }, [isDark, colors.tint, colors.background]);

  // Set default theme based on system preference if none is set yet
  useEffect(() => {
    if (!theme) {
      // Use dark theme (Midnight Summer) as the default for new users
      dispatch(setTheme(Theme.Dark)); // Default to dark theme for comfortable evening study
    }
  }, [dispatch, theme]);

  // Handle preloading app data - start when auth is ready
  useEffect(() => {
    if (!isAuthLoading && !isLoaded && !hasTriggeredPreload.current) {
      hasTriggeredPreload.current = true;
      preloadAppData().catch(() => {
        // Preload errors are already logged in the preloader
      });
    }
  }, [isAuthLoading, isLoaded, preloadAppData]);

  // Wait for all resources before setting appReady
  useEffect(() => {
    // Fonts must be loaded (for Expo Go and runtime loading). A load failure
    // still counts as resolved — see the fontError effect above.
    const fontsAreReady = fontsLoaded || !!fontError;

    // Auth must be fully resolved (not loading anymore)
    const authIsReady = !isAuthLoading;

    // Critical content must be loaded (articles, categories, etc.)
    const contentIsReady = isLoaded;

    // CRITICAL: Require fonts AND auth AND content to be ready
    // This prevents janky behavior from showing UI before resources are available
    // Once ready, never set back to false (prevents unmounting during refresh)
    if (fontsAreReady && authIsReady && contentIsReady && !appReady) {
      // Latching transition tied to async resource readiness (fonts/auth/content)
      // and bundled side effects (splash hide, analytics). Derived state can't
      // express the one-shot side-effect chain without re-firing.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAppReady(true);

      // Hide splash screen when app is ready
      SplashScreen.hide();

      // Track app opened event
      analytics.track(ANALYTICS_EVENTS.APP_OPENED, {
        timestamp: new Date().toISOString(),
      });
    }
  }, [fontsLoaded, fontError, isAuthLoading, isLoaded, appReady]);

  // Initialize notifications when app is ready (Expo best practice)
  useEffect(() => {
    if (appReady) {
      const initializeAppServices = async () => {
        try {
          await initializeNotifications();
          await registerBackgroundTasks();
        } catch {
          // Silently handle app service initialization failures
        }
      };

      initializeAppServices();
    }
  }, [appReady]);

  // Set up notification navigation callback
  useEffect(() => {
    if (!appReady) return;

    // Set navigation callback for when user taps notifications
    setNotificationNavigationCallback((path: string) => {
      router.push(path);
    });

    return () => {
      clearNotificationNavigationCallback();
    };
  }, [appReady, router]);

  // Handle cold start notifications (when app launches from notification)
  useEffect(() => {
    if (!appReady) return;

    const handleColdStartNotification = async () => {
      try {
        if (!Notifications) return;

        const response = Notifications.getLastNotificationResponse();

        if (response) {
          const { type } = response.notification.request.content.data || {};

          if (typeof type === 'string') {
            const route = NOTIFICATION_ROUTE_BY_TYPE[type as AnyNotificationType];
            if (route) {
              if (type === NOTIFICATION_TYPES.SRS_DUE || type === NOTIFICATION_TYPES.SRS_SLIPPING) {
                analytics.track(ANALYTICS_EVENTS.SMART_REMINDER_OPENED, { type, coldStart: true });
              }
              router.push(route);
            }
          }

          // Clear the last notification response to prevent re-handling on next launch
          Notifications.clearLastNotificationResponse();
        }
      } catch (error) {
        // Silently handle cold start notification errors
        handleError(error, {
          showToast: false,
          analyticsEventName: 'Cold_Start_Notification_Error',
        });
      }
    };

    handleColdStartNotification();
  }, [appReady, router]);

  // Cleanup notifications, background tasks, audio, and app badge on unmount
  useEffect(() => {
    return () => {
      cleanupNotifications();
      unregisterBackgroundTasks().catch(() => {
        // Silently handle background task cleanup errors
      });
      // Cleanup audio service to release audio session
      simpleAudioService.destroy().catch(() => {
        // Silently handle audio cleanup errors during unmount
      });
      // Clear app badge when app is unmounted (async cleanup)
      clearAppBadge().catch(error => {
        // Silently handle badge cleanup errors during unmount
        handleError(error as Error, {
          analyticsEventName: 'App_Badge_Cleanup_Failed',
          sentryTags: { location: 'app', action: 'badge_cleanup' },
          showToast: false, // Silent failure during cleanup
          sentrySeverity: 'info', // Not critical, just cleanup failure
        });
      });
    };
  }, []);

  const handleAppStateChange = useEffectEvent((nextAppState: AppStateStatus) => {
    const wasActive = appState.current === 'active';
    const wasInactive = appState.current !== 'active';
    const isActivating = wasInactive && nextAppState === 'active';
    const isBackgrounding = wasActive && nextAppState !== 'active';

    appState.current = nextAppState;

    if (isBackgrounding && appReady) {
      backgroundedTime.current = Date.now();
      const sessionDurationMs = Date.now() - sessionStartTime;
      analytics.track(ANALYTICS_EVENTS.APP_BACKGROUNDED, {
        session_duration_ms: sessionDurationMs,
      });

      // The process can be killed with no further warning once backgrounded —
      // by the OS, or by the user swiping it away. A paused offline mutation
      // (FSRS grade, saved word) otherwise only survives that if the cache
      // persister's 1s throttle had already fired on its own; this forces an
      // immediate, unthrottled write of whatever is pending right now.
      void flushPersistedQueryCache(queryClient);
    }

    if (!isActivating || !appReady) return;

    const timeBackgroundedMs = backgroundedTime.current ? Date.now() - backgroundedTime.current : 0;
    analytics.track(ANALYTICS_EVENTS.APP_RESUMED, {
      time_backgrounded_ms: timeBackgroundedMs,
    });
    backgroundedTime.current = null;

    const resumedUserId = session?.user?.id;

    if (resumeRefreshTimer.current) clearTimeout(resumeRefreshTimer.current);
    resumeRefreshTimer.current = setTimeout(() => {
      resumeRefreshTimer.current = null;
      void preloadAppData();

      // The streak is date-derived, but its query opts out of every automatic
      // refetch (refetchOnMount and refetchOnWindowFocus are both false) and
      // preloadAppData never touches it, so it only moved when a finished
      // review session invalidated it. Left backgrounded across midnight, the
      // Practice tile kept showing a figure computed for the previous day.
      // Invalidating refetches the mounted streak query and marks the (usually
      // unmounted) history stale — the timer above already collapses rapid
      // app-switching into a single pass.
      if (resumedUserId) void studyStreakQueries.invalidateAll(queryClient, resumedUserId);
    }, TIMING_CONSTANTS.MEDIUM_DELAY);
  });

  // Cleanup effect for AppState subscription
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (resumeRefreshTimer.current) clearTimeout(resumeRefreshTimer.current);
    };
  }, []);

  // Auth-gated navigation is handled declaratively below via <Stack.Protected>
  // guards on the route groups. The runtime redirects users to the next
  // available unprotected route when a guard flips, and enforces guards on
  // deep links automatically — no imperative router.replace needed.

  // Don't render Stack until app is ready to prevent slide animation on initial load
  if (!appReady) {
    return null;
  }

  const isAuthenticated = !!session;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FSRSDataProvider userId={session?.user?.id}>
          <VoiceGradingProvider>
            <GlobalAudioStateProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  headerTitle: '',
                  headerShadowVisible: false,
                  freezeOnBlur: true,
                  contentStyle: { backgroundColor: colors.background },
                }}
                // Opportunistic, not the mechanism — see `sheetNavigation`.
                //
                // A sheet that navigates somewhere on its way out cannot present
                // until its own dismissal finishes, and `transitionEnd` with
                // `closing: true` is exactly that moment. Measured on Android,
                // though, it never arrives: the closing screen leaves JS state
                // before the native transition ends, so its listeners are gone
                // by the time the event would be delivered (the opening
                // `closing: false` does fire, which is how we know this is wired
                // and not silent). iOS may deliver it, and if it does the
                // navigation happens on that frame instead of on the backstop
                // timer. Flushing on ANY closing transition is safe: the queue is
                // only ever filled immediately before a dismissal.
                screenListeners={{
                  transitionEnd: e => {
                    if (e.data.closing) flushPendingSheetNavigation();
                  },
                }}
              >
                {/* Authenticated routes — guard flips on sign-out, router unmounts these */}
                <Stack.Protected guard={isAuthenticated}>
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      // Animation re-enabled after Stack.Protected migration. The
                      // previous `animation: 'none'` worked around a black-screen
                      // bug caused by imperative router.replace racing with mount.
                      // Declarative guards mount directly into the right route, so
                      // the race is gone — fade matches the auth screen for a
                      // symmetric sign-in / sign-out transition.
                      animation: 'fade',
                      freezeOnBlur: false, // Keep tabs active
                    }}
                  />
                  <Stack.Screen
                    name="article/[id]"
                    options={createNavigationOptions(colors, {
                      headerShown: false,
                      freezeOnBlur: true, // Optimize article screen when backgrounded
                      /*
                       * Full screen, not the app's usual pageSheet — the reader
                       * is the one modal that hosts a bottom sheet.
                       *
                       * iOS drives a pageSheet's interactive dismissal from any
                       * scroll view inside it, so dragging the word card down
                       * dragged the article with it. `gestureEnabled: false`
                       * does NOT fix that: on `presentation: 'modal'` it blocks
                       * only the final dismissal and leaves the modal tracking
                       * the finger and springing back
                       * (software-mansion/react-native-screens#1410, open since
                       * 2022). That matches the report exactly — "both pull down
                       * like the finger is pulling both".
                       *
                       * `fullScreenModal` is `UIModalPresentationFullScreen`,
                       * which has no dismissal gesture to conflict with. The
                       * conflict cannot be suppressed on a pageSheet, so the
                       * reader stops being one.
                       *
                       * Costs the swipe-down exit and the inset card look;
                       * `CloseButton` and the Android back gesture are
                       * unaffected, and Android falls back to `modal` anyway.
                       * `gestureEnabled` stays false to state the intent if the
                       * presentation is ever changed back.
                       */
                      presentation: 'fullScreenModal',
                      gestureEnabled: false,
                      fullScreenGestureEnabled: false,
                    })}
                  />
                  <Stack.Screen
                    name="review"
                    options={createNavigationOptions(colors, {
                      headerShown: false,
                      freezeOnBlur: true,
                    })}
                  />
                  <Stack.Screen name="sleep-timer" options={createSheetOptions(colors, [0.4])} />
                  {/* These four fit their contents: fixed-height charts, or a
                      handful of rows, under a short header — no scrolling. See
                      createSheetOptions for what 'fitToContents' requires of the
                      screen's content. */}
                  <Stack.Screen name="due-words" options={createSheetOptions(colors)} />
                  <Stack.Screen name="memory-retention" options={createSheetOptions(colors)} />
                  <Stack.Screen name="study-streak" options={createSheetOptions(colors)} />
                  <Stack.Screen name="review-depth" options={createSheetOptions(colors)} />
                  {/* The odd one out: up to 20 leech rows never fit their
                      contents, so this sheet scrolls and needs a fixed detent.
                      Its screen owns the sheet background because the scroll
                      view has to be a direct child — the route file documents
                      the layout react-native-screens requires. */}
                  <Stack.Screen
                    name="words-to-revisit"
                    options={createSheetOptions(colors, [0.6, 1])}
                  />
                  {/* One saved word, root-level so the Explore rail can present
                      it without changing tabs. Fixed detents for the same reason
                      as the sheet above: a memory panel, a stat block and a root
                      explanation do not fit their contents, so this one scrolls
                      and its screen owns the two-child layout that requires. */}
                  <Stack.Screen name="word-detail" options={createSheetOptions(colors, [0.6, 1])} />
                </Stack.Protected>

                {/* Unauthenticated routes — guard flips on sign-in, router unmounts auth */}
                <Stack.Protected guard={!isAuthenticated}>
                  <Stack.Screen
                    name="auth"
                    options={{
                      animation: 'fade',
                      freezeOnBlur: false, // Keep auth screen active
                    }}
                  />
                </Stack.Protected>

                {/* Audio overlays - mini-player and sleep timer */}
              </Stack>

              {/* Audio overlays are isolated to prevent root re-renders on audio ticks */}
              <AudioOverlays />

              <StatusBar style={isDark ? 'light' : 'dark'} />
            </GlobalAudioStateProvider>
          </VoiceGradingProvider>
        </FSRSDataProvider>
      </View>
    </NavigationThemeProvider>
  );
}

interface FallbackProps {
  readonly error: unknown;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gestureRoot: {
    flex: 1,
  },
});

const AudioOverlays = memo(function AudioOverlays() {
  return (
    <AudioErrorBoundary>
      <GlobalMiniPlayer />
    </AudioErrorBoundary>
  );
});

const ErrorFallback = memo(function ErrorFallback({ error }: FallbackProps) {
  return <AppErrorFallback error={error} showDetails roomy />;
});

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <Provider store={store}>
        <PersistGate loading={<View />} persistor={persistor}>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={PERSISTENCE_OPTIONS}
            onSuccess={resumePausedMutationsOnRestore}
          >
            <AuthProvider>
              {/* initialMetrics seeds the insets synchronously from the native side,
                  so the first frame is laid out with real safe areas instead of
                  zeros that get corrected a frame later. */}
              <SafeAreaProvider initialMetrics={initialWindowMetrics}>
                <TutorialProvider>
                  <ToastProvider>
                    <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error} />}>
                      <AppContent />
                    </Sentry.ErrorBoundary>
                  </ToastProvider>
                </TutorialProvider>
              </SafeAreaProvider>
            </AuthProvider>
          </PersistQueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
});
