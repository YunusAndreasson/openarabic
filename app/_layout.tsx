import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import * as Sentry from '@sentry/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  useNavigationContainerRef,
  useRouter,
} from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { ThemedText } from '@/components/ThemedText';
import { AudioErrorBoundary, GlobalMiniPlayer } from '@/components/audio';
import {
  AuthProvider,
  FSRSDataProvider,
  ToastProvider,
  TutorialProvider,
} from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { Theme } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { QUERY_DEFAULTS } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppBadge } from '@/hooks/app/useAppBadge';
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
import { createNavigationOptions } from '@/utils/navigation';
import { PERSISTENCE_OPTIONS } from '@/utils/queryPersistence';
import type * as NotificationsModule from 'expo-notifications';

// expo-notifications is unavailable in Expo Go on Android (SDK 53+).
let Notifications: typeof NotificationsModule | null = null;
try {
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications unavailable in Expo Go on Android (SDK 53+)
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Smooth fade-out transition when hiding the splash screen
SplashScreen.setOptions({ fade: true, duration: 400 });

// Sync React Query online status with device connectivity
onlineManager.setEventListener((setOnline: (online: boolean) => void) => {
  return NetInfo.addEventListener((state: NetInfoState) => {
    setOnline(Boolean(state.isConnected));
  });
});
NetInfo.fetch().then((state: NetInfoState) => onlineManager.setOnline(Boolean(state.isConnected)));

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
  tracesSampleRate: 1.0, // Sample everything (100%)
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
  const { isLoading: isAuthLoading, session } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const router = useRouter();

  // Load fonts at runtime for Expo Go compatibility
  // PostScript names are used for cross-platform consistency (especially iOS)
  const [fontsLoaded] = useFonts({
    'NotoSansArabic-Regular': notoSansFont,
    'Amiri-Regular': amiriFont,
    DigitalKhattNewMadinaRegular: madinaFont,
    'ScheherazadeNew-Regular': scheherazadeFont,
    'NotoNastaliqUrdu-Regular': nastaliqFont,
    'Inter-Regular': interRegular,
    'Inter-SemiBold': interSemiBold,
    'Inter-Bold': interBold,
  });

  // Centralized system UI theme management
  useSystemUITheme();

  // App badge management - monitors due words and updates app icon badge
  useAppBadge();

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

  useEffect(() => {
    if (!appReady || isAuthLoading) return;

    // Configure Android navigation bar button style (background is transparent in edge-to-edge mode)
    if (Platform.OS === 'android') {
      NavigationBar.setStyle(isDark ? 'light' : 'dark');
    }

    // Pre-configure audio session for background playback (call service directly to avoid subscribing to audio state)
    simpleAudioService.preconfigureAudioSession();

    const identifyUser = async () => {
      if (session?.user) {
        try {
          await analytics.identify(session.user.id, {
            last_active: new Date().toISOString(),
          });
        } catch (err) {
          // Silently ignore analytics errors
          handleError(err as Error, { showToast: false });
        }
      }
    };

    identifyUser();
  }, [session, appReady, isAuthLoading]);

  const colors = useColors();

  // Optimized navigation theme - memoize with stable colors reference
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.tint,
      },
    };
  }, [isDark, colors.tint]);

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
    // Fonts must be loaded (for Expo Go and runtime loading)
    const fontsAreReady = fontsLoaded;

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
  }, [fontsLoaded, isAuthLoading, isLoaded, appReady]);

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

        const response = await Notifications.getLastNotificationResponseAsync();

        if (response) {
          const { type } = response.notification.request.content.data || {};

          // Navigate to Practice tab if it's a study reminder
          if (type === 'study-reminder') {
            router.push(ROUTE_PATHS.PRACTICE_TAB);
          }

          // Clear the last notification response to prevent re-handling on next launch
          await Notifications.clearLastNotificationResponseAsync();
        }
      } catch (error) {
        // Silently handle cold start notification errors
        handleError(error as Error, {
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

  // Cleanup effect for AppState subscription
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasActive = appState.current === 'active';
      const wasInactive = appState.current !== 'active';
      const isActivating = wasInactive && nextAppState === 'active';
      const isBackgrounding = wasActive && nextAppState !== 'active';

      appState.current = nextAppState;

      if (isBackgrounding && appReady) {
        // Track app backgrounded
        backgroundedTime.current = Date.now();
        const sessionDurationMs = Date.now() - sessionStartTime;
        analytics.track(ANALYTICS_EVENTS.APP_BACKGROUNDED, {
          session_duration_ms: sessionDurationMs,
        });
      }

      if (isActivating && appReady) {
        // Track app resumed
        const timeBackgroundedMs = backgroundedTime.current
          ? Date.now() - backgroundedTime.current
          : 0;
        analytics.track(ANALYTICS_EVENTS.APP_RESUMED, {
          time_backgrounded_ms: timeBackgroundedMs,
        });
        backgroundedTime.current = null;

        // When resuming from background, refresh app data
        setTimeout(preloadAppData, TIMING_CONSTANTS.MEDIUM_DELAY);
      }
    });

    return () => subscription.remove();
  }, [appReady, preloadAppData]);

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
          <GlobalAudioStateProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                headerTitle: '',
                headerShadowVisible: false,
                freezeOnBlur: true,
                contentStyle: { backgroundColor: colors.background },
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
                  })}
                />
                <Stack.Screen
                  name="review"
                  options={createNavigationOptions(colors, {
                    headerShown: false,
                    freezeOnBlur: true,
                  })}
                />
                <Stack.Screen
                  name="sleep-timer"
                  options={{
                    presentation: 'formSheet',
                    sheetAllowedDetents: [0.4],
                    sheetGrabberVisible: true,
                    sheetCornerRadius: 24,
                    headerShown: false,
                  }}
                />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  errorTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  errorMessage: {
    marginBottom: LAYOUT.SPACING.XLARGE,
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
  const errorMessage = error instanceof Error ? error.toString() : STRINGS.UNKNOWN_ERROR_OCCURRED;
  return (
    <View style={styles.errorContainer}>
      <ThemedText type="heading3" variant="error" style={styles.errorTitle}>
        {STRINGS.SOMETHING_WENT_WRONG}
      </ThemedText>
      <ThemedText style={styles.errorMessage} type="body">
        {STRINGS.PLEASE_TRY_AGAIN}
      </ThemedText>
      <ThemedText colorName="textTertiary" type="caption">
        {errorMessage}
      </ThemedText>
    </View>
  );
});

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <Provider store={store}>
        <PersistGate loading={<View />} persistor={persistor}>
          <PersistQueryClientProvider client={queryClient} persistOptions={PERSISTENCE_OPTIONS}>
            <AuthProvider>
              <SafeAreaProvider>
                <TutorialProvider>
                  <ToastProvider>
                    <Sentry.ErrorBoundary
                      fallback={({ error }) => <ErrorFallback error={error} />}
                    >
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
