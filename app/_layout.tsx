import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, {
  useEffect,
  useState,
  useRef,
  Component,
  useMemo,
  createContext,
  useContext,
  memo,
  useCallback,
} from 'react';
import 'react-native-reanimated';
import { AppState, View, StyleSheet, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { AuthProvider } from '@/components/AuthProvider';
import { ThemedText } from '@/components/ThemedText';
import { ToastProvider } from '@/components/ToastProvider';
import { Theme } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { RootState } from '@/store/store';
import { handleError } from '@/utils/errorHandling';

import figtreeFont from '../assets/fonts/Figtree.ttf';
import madinaFont from '../assets/fonts/Madina.otf';
import { useAppPreloader } from '../hooks/useAppPreloader';
import { useAuth } from '../hooks/useAuth';
import { analytics } from '../services/analytics';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { store, persistor } from '../store/store';
import { setTheme } from '../store/themeSlice';

import { useArticlesAndDueWordsLoaded } from './(tabs)/index';

// Splash screen will be initialized inside the component to avoid conflicts with expo-router

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
  debug: __DEV__, // Enable debug logging in dev
});

const reviewScreenOptions = {
  headerShown: false,
  animation: 'none',
  presentation: 'containedModal',
  gestureEnabled: false,
} as const;

interface AppLoadingContextType {
  initialLoadComplete: boolean;
  wasPreloaded: boolean;
}

export const AppLoadingContext = createContext<AppLoadingContextType>({
  initialLoadComplete: false,
  wasPreloaded: false,
});

export const useAppLoading = (): AppLoadingContextType => useContext(AppLoadingContext);

function AppContent() {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state: RootState) => state.theme);
  const isDark = theme === Theme.Dark;
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, session } = useAuth();
  const navigationRef = useNavigationContainerRef();
  const [hasAttemptedRedirect, setHasAttemptedRedirect] = useState(false);
  const router = useRouter();

  // Initialize splash screen inside component to avoid expo-router conflicts
  useEffect(() => {
    const initializeSplashScreen = async () => {
      try {
        // Check if the SplashScreen module is available and has the required methods
        if (SplashScreen && typeof SplashScreen.preventAutoHideAsync === 'function') {
          await SplashScreen.preventAutoHideAsync();

          // Configure splash screen to be visible for at least 1 second with fade effect
          if (typeof SplashScreen.setOptions === 'function') {
            SplashScreen.setOptions({
              duration: 1000,
            });
          }
        } else {
          console.warn('SplashScreen module not properly initialized');
        }
      } catch (err) {
        // Handle the case where the module isn't ready yet
        console.warn('Failed to initialize splash screen:', err);
        Sentry.captureException(err, {
          tags: {
            location: 'splash_screen_initialization',
          },
        });
      }
    };

    initializeSplashScreen();
  }, []); // Run once on component mount

  const [fontsLoaded] = useFonts({
    Madina: madinaFont,
    Figtree: figtreeFont,
  });

  const { preloadAppData, isLoaded } = useAppPreloader();
  const articlesAndDueWordsLoaded = useArticlesAndDueWordsLoaded();

  const appLoadingContext = useMemo(
    () => ({
      initialLoadComplete: appReady,
      wasPreloaded: isLoaded,
    }),
    [appReady, isLoaded]
  );

  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  useEffect(() => {
    if (!appReady || isAuthLoading) return;

    const identifyUser = async () => {
      try {
        if (session?.user) {
          await analytics.identify(session.user.id, {
            email: session.user.email,
            last_active: new Date().toISOString(),
          });
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            location: 'analytics_identify',
          },
          level: 'warning',
        });
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

  // Set default theme if none is set yet
  useEffect(() => {
    if (!theme) {
      dispatch(setTheme(Theme.Dark));
    }
  }, [dispatch, theme]);

  // Handle preloading app data
  useEffect(() => {
    if (!isAuthLoading && !isLoaded) {
      preloadAppData();
    }
  }, [isAuthLoading, isLoaded, preloadAppData]);

  // Hide splash screen after first layout
  const onLayoutRootView = useCallback(() => {
    if (appReady) {
      // Check if SplashScreen module is available before hiding
      if (SplashScreen && typeof SplashScreen.hideAsync === 'function') {
        SplashScreen.hideAsync().catch(err => {
          // Handle cases where splash screen hiding fails
          console.warn('Failed to hide splash screen:', err);
          Sentry.captureException(err, {
            tags: {
              location: 'splash_screen_hide',
            },
          });
        });
      }
    }
  }, [appReady]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    // Maximum time to wait for app to be ready (in milliseconds)
    const MAX_LOADING_TIME = 8000; // Increased to 8 seconds from 5
    // Authentication timeout - increased to allow for proper initialization
    const AUTH_TIMEOUT = 5000; // Increased to 5 seconds from 3

    let timeoutId: ReturnType<typeof setTimeout>;
    let authTimeoutId: ReturnType<typeof setTimeout>;

    // Separate timeout just for auth to ensure we don't block UI rendering
    if (!appReady && isAuthLoading) {
      authTimeoutId = setTimeout(() => {
        handleError(
          new Error('Auth loading timeout reached - proceeding with app initialization'),
          { showToast: false, sentrySeverity: 'warning' }
        );
        // This doesn't affect the actual auth state, just lets the app proceed
        // The auth system will keep trying in the background
      }, AUTH_TIMEOUT);
    }

    if (!appReady && fontsLoaded) {
      timeoutId = setTimeout(() => {
        handleError(new Error('App loading timeout reached - forcing app ready state'), {
          showToast: false,
          sentrySeverity: 'warning',
        });
        setAppReady(true);
      }, MAX_LOADING_TIME);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (authTimeoutId) clearTimeout(authTimeoutId);
    };
  }, [appReady, fontsLoaded, isAuthLoading]);

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
  }, [fontsLoaded, isAuthLoading, isLoaded, articlesAndDueWordsLoaded, session]);

  // Cleanup effect for AppState subscription
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasInactive = appState.current !== 'active';
      const isActivating = wasInactive && nextAppState === 'active';

      appState.current = nextAppState;

      if (isActivating && appReady) {
        Sentry.addBreadcrumb({
          category: 'app_lifecycle',
          message: 'App resumed from background',
          level: 'info',
        });

        // When resuming from background, refresh app data
        const timeoutId = setTimeout(preloadAppData, 300);
        return () => clearTimeout(timeoutId);
      }
      return undefined;
    });

    return () => {
      Sentry.addBreadcrumb({
        category: 'app_lifecycle',
        message: 'Removing app state subscription',
        level: 'info',
      });
      subscription.remove();
    };
  }, [appReady, preloadAppData]);

  // Perform session-based navigation after app is ready
  useEffect(() => {
    if (appReady && !isAuthLoading && !hasAttemptedRedirect) {
      setHasAttemptedRedirect(true);

      try {
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Redirecting based on session state',
          level: 'info',
        });

        if (session) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Valid session found, redirecting to main app',
            level: 'info',
          });
          router.replace('/(tabs)');
        } else {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'No valid session, redirecting to auth',
            level: 'info',
          });
          router.replace('/auth');
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            location: 'app_layout',
            action: 'session_redirect',
          },
        });
        // On error, default to auth screen
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
      <AppLoadingContext.Provider value={appLoadingContext}>
        <View style={styles.container} onLayout={onLayoutRootView}>
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
            <Stack.Screen name="article" options={{ headerShown: false }} />
            <Stack.Screen name="review" options={reviewScreenOptions} />
            <Stack.Screen name="practice" options={reviewScreenOptions} />
            <Stack.Screen name="insights" options={{ headerShown: true }} />
            <Stack.Screen name="index" />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </AppLoadingContext.Provider>
    </NavigationThemeProvider>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultState: ErrorBoundaryState = { hasError: false, error: null };

  state = ErrorBoundary.defaultState;

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report to Sentry with component stack
    Sentry.captureException(error, {
      tags: { location: 'error_boundary' },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  shouldComponentUpdate(_prevProps: ErrorBoundaryProps, nextState: ErrorBoundaryState): boolean {
    if (this.state.hasError !== nextState.hasError) return true;
    if (this.state.error !== nextState.error) return true;
    return false;
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const { FallbackComponent } = this.props;
      return <FallbackComponent error={this.state.error} />;
    }
    return this.props.children;
  }
}

interface FallbackProps {
  readonly error: Error;
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
      <ThemedText type="body" style={{ marginBottom: LAYOUT.SPACING.XLARGE }}>
        Please try again
      </ThemedText>
      <ThemedText type="caption" colorName="textTertiary">
        {error.toString()}
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
                  <ErrorBoundary FallbackComponent={ErrorFallback}>
                    <AppContent />
                  </ErrorBoundary>
                </ToastProvider>
              </SafeAreaProvider>
            </AuthProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
});
