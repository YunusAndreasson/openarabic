// Polyfills must be imported first and synchronously
import 'react-native-url-polyfill/auto';

// Ensure URL and URLSearchParams are available globally before any other code runs
if (typeof global !== 'undefined') {
  if (!global.URL) {
    global.URL = require('react-native-url-polyfill').URL;
  }
  if (!global.URLSearchParams) {
    global.URLSearchParams = require('react-native-url-polyfill').URLSearchParams;
  }
  if (!global.location) {
    global.location = { href: '' };
  }
}

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import NetInfo from '@react-native-community/netinfo';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import amiriFont from '@/assets/fonts/Amiri.ttf';
import interFont from '@/assets/fonts/Inter.ttf';
import madinaFont from '@/assets/fonts/Madina.otf';
import nastaliqFont from '@/assets/fonts/Nastaliq.ttf';
import notoSansFont from '@/assets/fonts/NotoSans.ttf';
import scheherazadeFont from '@/assets/fonts/Scheherazade.ttf';
import { ThemedText } from '@/components/ThemedText';
import { MiniPlayer } from '@/components/audio';
import { SleepTimer } from '@/components/listen';
import { AuthProvider, ToastProvider } from '@/components/providers';
import { StreaksBottomSheet } from '@/components/read/StreaksBottomSheet';
import { Theme } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { createNavigationOptions } from '@/constants/modal';
import { QUERY_DEFAULTS } from '@/constants/queryConfig';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { StreaksProvider, useStreaks } from '@/contexts/StreaksContext';
import { useAppBadge } from '@/hooks/app/useAppBadge';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useReadTabDataLoaded } from '@/hooks/app/useArticlesAndDueWordsLoaded';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useSystemUITheme } from '@/hooks/theme/useSystemUITheme';
import { FSRSDataProvider } from '@/hooks/vocabulary/FSRSDataProvider';
import { analytics } from '@/services/analytics';
import {
  cleanupNotifications,
  clearAppBadge,
  initializeNotifications,
} from '@/services/notificationService';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { persistor, store } from '@/store/store';
import { setTheme } from '@/store/themeSlice';
import { getEnvVar } from '@/utils/env';
import { handleError } from '@/utils/errorHandling';
import { PERSISTENCE_OPTIONS } from '@/utils/queryPersistence';

// Splash screen is now managed by expo-router v5's internal system
// No manual preventAutoHideAsync needed - expo-router handles this automatically

// Sync React Query online status with device connectivity
onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(Boolean(state.isConnected));
  });
});
NetInfo.fetch().then(state => onlineManager.setOnline(Boolean(state.isConnected)));

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
const sentryDsn = getEnvVar('EXPO_PUBLIC_SENTRY_DSN', undefined, true);

Sentry.init({
  dsn: sentryDsn,
  integrations: [navigationIntegration],
  enabled: !!sentryDsn, // Only enable if DSN is available
  tracesSampleRate: 1.0, // Sample everything (100%)
  attachScreenshot: true, // Helps debug UI crashes
  debug: false, // Disable debug logging to reduce console noise
});

function AppContent() {
  const dispatch = useAppDispatch();
  const theme = useAppSelectorMemo((state: RootState) => state.theme.theme);
  const isDark = theme === Theme.Dark;
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, session } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);
  const router = useRouter();

  // Use streaks context
  const { isStreaksVisible, closeStreaks } = useStreaks();

  // Enable LayoutAnimation on Android for FAQ expand/collapse
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Centralized system UI theme management
  useSystemUITheme();

  // App badge management - monitors due words and updates app icon badge
  useAppBadge();

  // Global audio state moved into AudioOverlays to avoid re-rendering the root

  const [fontsLoaded] = useFonts({
    NotoSans: notoSansFont,
    Inter: interFont,
    Amiri: amiriFont,
    Madina: madinaFont,
    Scheherazade: scheherazadeFont,
    Nastaliq: nastaliqFont,
  });

  const { preloadAppData, isLoaded } = useAppPreloader();
  const readTabDataLoaded = useReadTabDataLoaded();

  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef);
      // Also register for performance route tracking used by rerender logger
    }
  }, [navigationRef]);

  useEffect(() => {
    if (!appReady || isAuthLoading) return;

    const identifyUser = async () => {
      if (session?.user) {
        try {
          await analytics.identify(session.user.id, {
            email: session.user.email,
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

  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    // On iOS, ensure the native back button uses our tint color by deriving a theme object
    if (Platform.OS === 'ios') {
      return {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: colors.tint,
        },
      };
    }
    return baseTheme;
  }, [isDark, colors.tint]);

  // Set default theme based on system preference if none is set yet
  useEffect(() => {
    if (!theme) {
      // Use dark theme (Midnight Summer) as the default for new users
      dispatch(setTheme(Theme.Dark)); // Default to dark theme for comfortable evening study
    }
  }, [dispatch, theme]);

  // Handle preloading app data
  useEffect(() => {
    if (!isAuthLoading && !isLoaded) {
      preloadAppData();
    }
  }, [isAuthLoading, isLoaded, preloadAppData]);

  // Wait for all resources before setting appReady
  useEffect(() => {
    // Primary condition - fonts must be loaded
    const fontsAreReady = fontsLoaded;

    // Either auth is ready or we've waited long enough
    const authIsReady = !isAuthLoading || session !== null;

    // Content is ready or we've waited long enough
    const contentIsReady = isLoaded && readTabDataLoaded;

    // Only proceed when fonts are ready AND (auth is ready OR we have content)
    if (fontsAreReady && (authIsReady || contentIsReady)) {
      setAppReady(true);

      // Hide splash screen with animation when app is ready
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {
          // Silently handle splash screen hide errors
        });
      }, 100); // Small delay to ensure smooth transition
    }
  }, [fontsLoaded, isAuthLoading, session, isLoaded, readTabDataLoaded]);

  // Initialize notifications when app is ready (Expo best practice)
  useEffect(() => {
    if (appReady) {
      initializeNotifications().catch(() => {
        // Silently handle notification initialization errors
        // Error is already handled in the notification service
      });
    }
  }, [appReady]);

  // Cleanup notifications and app badge on unmount
  useEffect(() => {
    return () => {
      cleanupNotifications();
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

  // Fallback timeout so the app doesn't remain stuck on the splash screen
  useEffect(() => {
    if (!fontsLoaded || appReady) return;
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, appReady]);

  // Cleanup effect for AppState subscription
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasInactive = appState.current !== 'active';
      const isActivating = wasInactive && nextAppState === 'active';

      appState.current = nextAppState;

      if (isActivating && appReady) {
        // When resuming from background, refresh app data
        setTimeout(preloadAppData, 300);
      }
    });

    return () => subscription.remove();
  }, [appReady, preloadAppData]);

  // Perform session-based navigation after app is ready
  useEffect(() => {
    if (appReady && !isAuthLoading && !hasAttemptedRedirect) {
      setHasAttemptedRedirect(true);

      try {
        if (session) {
          router.replace(ROUTE_PATHS.READ_TAB);
        } else {
          router.replace(ROUTE_PATHS.AUTH);
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            location: 'app_layout',
            action: 'session_redirect',
          },
        });
        router.replace(ROUTE_PATHS.AUTH);
      }
    }
  }, [appReady, isAuthLoading, hasAttemptedRedirect, session, router]);

  // Show branded loading screen until the app is ready
  if (!appReady) {
    return (
      <View
        style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* App Logo */}
        <Image
          source={require('@/assets/images/oaLogo.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />

        {/* Loading Text */}
        <ThemedText type="body" style={[styles.loadingText, { color: colors.tint }]}>
          {STRINGS.LOADING}
        </ThemedText>

        {/* Loading Indicator */}
        <ActivityIndicator size="large" color={colors.tint} style={styles.loadingIndicator} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <FSRSDataProvider userId={session?.user?.id}>
        <SafeAreaView style={styles.container} edges={['left', 'right']}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="auth"
              options={{
                headerShown: false,
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="article/[id]"
              options={createNavigationOptions(colors, {
                headerShown: false,
              })}
            />
            <Stack.Screen
              name="practice/review"
              options={createNavigationOptions(colors, {
                headerShown: false,
                presentation: 'fullScreenModal',
                gestureEnabled: true,
              })}
            />

            {/* Audio overlays - mini-player and sleep timer */}
          </Stack>

          {/* Audio overlays are isolated to prevent root re-renders on audio ticks */}
          <AudioOverlays />

          {/* Streaks Bottom Sheet - rendered at root level for proper z-index */}
          <StreaksBottomSheet isVisible={isStreaksVisible} onClose={closeStreaks} />

          <StatusBar style={isDark ? 'light' : 'dark'} />
        </SafeAreaView>
      </FSRSDataProvider>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  loadingLogo: {
    width: 120,
    height: 120,
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  loadingText: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  loadingIndicator: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  gestureRoot: {
    flex: 1,
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
  const globalAudioState = useGlobalAudioState();

  const shouldShowMiniPlayer =
    Boolean(globalAudioState.currentArticle) &&
    (globalAudioState.isPlaying || globalAudioState.audioState === 'loading') &&
    !globalAudioState.showSleepTimerModal &&
    !globalAudioState.shouldHideMiniPlayer;

  return (
    <>
      {shouldShowMiniPlayer && globalAudioState.currentArticle && (
        <MiniPlayer
          article={globalAudioState.currentArticle}
          isPlaying={globalAudioState.isPlaying}
          isTimerActive={globalAudioState.isTimerActive}
          position={globalAudioState.position}
          duration={globalAudioState.duration}
          queuePosition={globalAudioState.queuePosition}
          onPlayPause={globalAudioState.onPlayPause}
          onTimerPress={globalAudioState.onTimerPress}
        />
      )}

      {/* SleepTimer rendered last to ensure it overlays everything */}
      <SleepTimer
        isVisible={globalAudioState.showSleepTimerModal}
        isTimerActive={globalAudioState.isTimerActive}
        remainingTime={globalAudioState.sleepTimerRemainingTime}
        onClose={globalAudioState.onSleepTimerClose}
        onTimerSet={globalAudioState.onSleepTimerSet}
        onTimerCancel={globalAudioState.onSleepTimerCancel}
      />
    </>
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
        <PersistGate loading={null} persistor={persistor}>
          <PersistQueryClientProvider client={queryClient} persistOptions={PERSISTENCE_OPTIONS}>
            <AuthProvider>
              <SafeAreaProvider>
                <BottomSheetModalProvider>
                  <ToastProvider>
                    <StreaksProvider>
                      <Sentry.ErrorBoundary
                        fallback={({ error }) => <ErrorFallback error={error} />}
                      >
                        <AppContent />
                      </Sentry.ErrorBoundary>
                    </StreaksProvider>
                  </ToastProvider>
                </BottomSheetModalProvider>
              </SafeAreaProvider>
            </AuthProvider>
          </PersistQueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
});
