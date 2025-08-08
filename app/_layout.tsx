import '@/utils/splashPolyfill';
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
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { Theme } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { createNavigationOptions } from '@/constants/modal';
import { QUERY_DEFAULTS } from '@/constants/queryConfig';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useReadTabDataLoaded } from '@/hooks/app/useArticlesAndDueWordsLoaded';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useSystemUITheme } from '@/hooks/theme/useSystemUITheme';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { persistor, store } from '@/store/store';
import { setTheme } from '@/store/themeSlice';
import { handleError } from '@/utils/errorHandling';
import { PERSISTENCE_OPTIONS } from '@/utils/queryPersistence';

const analytics = {
  identify: async (_userId: string, _properties?: Record<string, unknown>) => {},
  reset: async () => {},
};

// Let expo-router handle splash screen initialization through app.json configuration
// This prevents conflicts with expo-router's internal splash screen management

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
      refetchOnMount: 'always', // Always refetch on mount for fresh data
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
Sentry.init({
  dsn: 'https://5ca58a5811a094515e346b0241e6a3f7@o1414696.ingest.us.sentry.io/4509090539831296',
  integrations: [navigationIntegration],
  enabled: true, // Enable in both dev and production
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

  // Configure splash screen fade animation
  useEffect(() => {
    SplashScreen.setOptions({
      duration: 1000, // 1 second fade animation duration
      fade: true, // Use fade animation
    });
  }, []);

  // Centralized system UI theme management
  useSystemUITheme();

  // Global audio state for mini-player
  const globalAudioState = useGlobalAudioState();

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
      // Use the enhanced theme detection which includes system preference fallback
      dispatch(setTheme(Theme.Dark)); // Default to dark as per current behavior
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
    }
  }, [fontsLoaded, isAuthLoading, session, isLoaded, readTabDataLoaded]);

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

  // Show loading screen until the app is ready
  if (!appReady) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={styles.container}>
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
            name="practice"
            options={createNavigationOptions(colors, {
              headerShown: false,
              presentation: 'fullScreenModal',
              gestureEnabled: true,
            })}
          />
          <Stack.Screen
            name="insights"
            options={createNavigationOptions(colors, {
              headerShown: false,
            })}
          />
          <Stack.Screen
            name="NowPlaying"
            options={createNavigationOptions(colors, {
              headerShown: false, // Full-screen modal without header
              gestureEnabled: true,
            })}
          />
        </Stack>

        {/* Mini-player always above tab bar, but below modals */}
        {globalAudioState.currentArticle &&
          (globalAudioState.isPlaying || globalAudioState.audioState === 'loading') &&
          !globalAudioState.showSleepTimerModal &&
          !globalAudioState.shouldHideMiniPlayer && (
            <MiniPlayer
              article={globalAudioState.currentArticle}
              isPlaying={globalAudioState.isPlaying}
              isTimerActive={globalAudioState.isTimerActive}
              position={globalAudioState.position}
              duration={globalAudioState.duration}
              onPlayPause={globalAudioState.onPlayPause}
              onTimerPress={globalAudioState.onTimerPress}
              onExpandPress={globalAudioState.onExpandPress}
              onMiniPlayerPress={globalAudioState.onMiniPlayerPress}
            />
          )}
        {/* SleepTimer rendered last to ensure it overlays everything */}
        <SleepTimer
          isVisible={globalAudioState.showSleepTimerModal}
          isActive={globalAudioState.isTimerActive}
          remainingTime={globalAudioState.sleepTimerRemainingTime}
          onClose={globalAudioState.onSleepTimerClose}
          onTimerSet={globalAudioState.onSleepTimerSet}
          onTimerCancel={globalAudioState.onSleepTimerCancel}
        />

        <StatusBar style={isDark ? 'light' : 'dark'} />
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
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.LARGE,
  },
  gestureRoot: {
    flex: 1,
  },
});

const ErrorFallback = memo(function ErrorFallback({ error }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.toString() : STRINGS.UNKNOWN_ERROR_OCCURRED;
  return (
    <View style={styles.errorContainer}>
      <ThemedText
        type="heading3"
        variant="error"
        style={{
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
          marginBottom: LAYOUT.SPACING.SMALL,
        }}
      >
        {STRINGS.SOMETHING_WENT_WRONG}
      </ThemedText>
      <ThemedText style={{ marginBottom: LAYOUT.SPACING.XLARGE }} type="body">
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
                    <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error} />}>
                      <AppContent />
                    </Sentry.ErrorBoundary>
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
