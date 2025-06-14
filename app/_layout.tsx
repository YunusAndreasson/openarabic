// Fix for expo-router v5.0.7 + React Native 0.79.3 splash screen compatibility issue
import '@/utils/splashPolyfill';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef, useMemo, memo } from 'react';
import 'react-native-reanimated';
import { AppState, View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import figtreeFont from '@/assets/fonts/Figtree.ttf';
import madinaFont from '@/assets/fonts/Madina.otf';
import { ThemedText } from '@/components/ThemedText';
import { AuthProvider, ToastProvider } from '@/components/providers';
import { Theme } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { createNavigationOptions } from '@/constants/modal';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useSystemUITheme } from '@/hooks/theme/useSystemUITheme';
import { useArticlesAndDueWordsLoaded } from '@/hooks/useArticlesAndDueWordsLoaded';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { store, persistor } from '@/store/store';
import { setTheme } from '@/store/themeSlice';
import { handleError } from '@/utils/errorHandling';

// Temporary mock analytics until service is fixed
const analytics = {
  identify: async (_userId: string, _properties?: any) => {},
  reset: async () => {},
};

// Let expo-router handle splash screen initialization through app.json configuration
// This prevents conflicts with expo-router's internal splash screen management

// Move queryClient outside component scope for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes default (for general data)
      gcTime: 600000, // 10 minutes default
      refetchOnMount: 'always', // Always refetch on mount for fresh data
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // Disable for mobile
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry mutations on client errors
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 2;
      },
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

  // Centralized system UI theme management
  useSystemUITheme();

  const [fontsLoaded] = useFonts({
    Madina: madinaFont,
    Figtree: figtreeFont,
  });

  const { preloadAppData, isLoaded } = useAppPreloader();
  const articlesAndDueWordsLoaded = useArticlesAndDueWordsLoaded();

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
  const navigationTheme = useMemo(() => (isDark ? DarkTheme : DefaultTheme), [isDark]);

  // Extend the navigation theme with custom colors for iOS back buttons
  React.useEffect(() => {
    // Update the navigation theme to ensure iOS back buttons use the tint color
    if (Platform.OS === 'ios') {
      // This affects the native iOS back button text color
      DefaultTheme.colors.primary = colors.tint;
      DarkTheme.colors.primary = colors.tint;
    }
  }, [colors.tint]);

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
    const contentIsReady = isLoaded && articlesAndDueWordsLoaded;

    // Only proceed when fonts are ready AND (auth is ready OR we have content)
    if (fontsAreReady && (authIsReady || contentIsReady)) {
      setAppReady(true);
    }
  }, [fontsLoaded, isAuthLoading, session, isLoaded, articlesAndDueWordsLoaded]);

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
          router.replace('/(tabs)/read');
        } else {
          router.replace('/auth');
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            location: 'app_layout',
            action: 'session_redirect',
          },
        });
        router.replace('/auth');
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
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="practice"
            options={createNavigationOptions(colors, {
              headerShown: false,
            })}
          />
          <Stack.Screen
            name="insights"
            options={createNavigationOptions(colors, {
              headerShown: false,
            })}
          />
        </Stack>
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
  const errorMessage = error instanceof Error ? error.toString() : 'Unknown error occurred';
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
        Something went wrong
      </ThemedText>
      <ThemedText style={{ marginBottom: LAYOUT.SPACING.XLARGE }} type="body">
        Please try again
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
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SafeAreaProvider>
                <ToastProvider>
                  <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error} />}>
                    <AppContent />
                  </Sentry.ErrorBoundary>
                </ToastProvider>
              </SafeAreaProvider>
            </AuthProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
});
