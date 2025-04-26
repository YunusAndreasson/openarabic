import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  Component,
  useMemo,
  createContext,
  useContext,
  memo,
} from 'react';
import 'react-native-reanimated';
import { AppState, View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { AppLoader } from '@/components/Loader';
import { ToastProvider } from '@/components/ToastProvider';
import { Theme } from '@/constants/Colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import type { RootState } from '@/store/store';

import madinaFont from '../assets/fonts/Madina.otf';
import philosopherFont from '../assets/fonts/Philosopher-Regular.ttf';
import { useAppPreloader } from '../hooks/useAppPreloader';
import { useAuth } from '../hooks/useAuth';
import { analytics } from '../services/analytics';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { store, persistor } from '../store/store';
import { setTheme } from '../store/themeSlice';

// Prevent splash screen from auto-hiding
try {
  SplashScreen.preventAutoHideAsync();
} catch (err) {
  Sentry.captureException(err, {
    tags: {
      location: 'splash_screen_prevention',
    },
  });
}

// Move queryClient outside component scope for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 3,
    },
    mutations: {
      retry: 3,
      gcTime: 0,
    },
  },
});

// Memoize navigation integration for Sentry
const navigationIntegration = Sentry.reactNavigationIntegration();
Sentry.init({
  dsn: 'https://5ca58a5811a094515e346b0241e6a3f7@o1414696.ingest.us.sentry.io/4509090539831296',
  integrations: [navigationIntegration],
  enabled: !__DEV__,
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
  const colors = useColors();
  const [appReady, setAppReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, session } = useAuth();
  const hasHiddenSplash = useRef(false);
  const navigationRef = useNavigationContainerRef();

  const [fontsLoaded] = useFonts({
    Philosopher: philosopherFont,
    NotoNaskhArabic: madinaFont,
  });

  const { preloadAppData, isLoaded } = useAppPreloader();

  const appLoadingContext = useMemo(
    () => ({
      initialLoadComplete: appReady,
      wasPreloaded: isLoaded,
    }),
    [appReady, isLoaded]
  );

  useEffect(() => {
    if (navigationRef?.current) {
      const navigationIntegration = Sentry.reactNavigationIntegration();
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

  const navigationTheme = useMemo(() => (isDark ? DarkTheme : DefaultTheme), [isDark]);

  // Set default theme if none is set yet
  useEffect(() => {
    if (!theme) {
      dispatch(setTheme(Theme.Light));
    }
  }, [dispatch, theme]);

  useEffect(() => {
    if (!isAuthLoading && !isLoaded) {
      preloadAppData();
    }
  }, [isAuthLoading, isLoaded, preloadAppData]);

  const SPLASH_SCREEN_TIMEOUT = 5000;
  const handleLayout = useCallback(async () => {
    if (!hasHiddenSplash.current && fontsLoaded) {
      setIsTransitioning(true);
      hasHiddenSplash.current = true;

      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise(resolve => {
        timeoutId = setTimeout(() => {
          Sentry.captureMessage('Splash screen hide timed out', {
            level: 'warning',
            tags: { location: 'splash_screen_hide' },
          });
          resolve(null);
        }, SPLASH_SCREEN_TIMEOUT);
      });

      try {
        await Promise.race([SplashScreen.hideAsync(), timeoutPromise]);
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 100);
        });
        setShowLoader(false);
        await new Promise(resolve => {
          timeoutId = setTimeout(resolve, 50);
        });
        setAppReady(true);
      } catch (err) {
        Sentry.captureException(err, {
          tags: { location: 'splash_screen_hide' },
        });
      } finally {
        clearTimeout(timeoutId);
        setIsTransitioning(false);
      }
    }
  }, [fontsLoaded]);

  // Cleanup effect for AppState subscription
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'background' && nextAppState === 'active' && appReady) {
        const timeoutId = setTimeout(preloadAppData, 300);
        return () => clearTimeout(timeoutId);
      }
      appState.current = nextAppState;
      return undefined;
    });

    return () => {
      subscription.remove();
    };
  }, [appReady, preloadAppData]);

  if (!fontsLoaded || isTransitioning) {
    return <AppLoader color={colors.tint} />;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <ToastProvider>
        <AppLoadingContext.Provider value={appLoadingContext}>
          <View style={styles.container} onLayout={handleLayout}>
            {!showLoader ? (
              <>
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
                  <Stack.Screen name="index" />
                </Stack>
                <StatusBar style={isDark ? 'light' : 'dark'} />
              </>
            ) : (
              <AppLoader color={colors.tint} />
            )}
          </View>
        </AppLoadingContext.Provider>
      </ToastProvider>
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
    padding: LAYOUT.SPACING.XLARGE,
  },
  errorDetail: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  errorMessage: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  errorTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  gestureRoot: {
    flex: 1,
  },
});

const ErrorFallback = memo(function ErrorFallback({ error }: FallbackProps) {
  const colors = useColors();
  return (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorTitle, { color: colors.error }]}>Something went wrong</Text>
      <Text style={[styles.errorMessage, { color: colors.text }]}>Please try again</Text>
      <Text style={[styles.errorDetail, { color: colors.text }]}>{error.toString()}</Text>
    </View>
  );
});

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <ToastProvider>
                <ErrorBoundary FallbackComponent={ErrorFallback}>
                  <AppContent />
                </ErrorBoundary>
              </ToastProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
});
