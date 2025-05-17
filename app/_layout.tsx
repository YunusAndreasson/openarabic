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
import { ToastProvider } from '@/components/ToastProvider';
import { ThemedText } from '@/components/ThemedText';
import { useArticlesAndDueWordsLoaded } from './(tabs)/index';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(err => {
  Sentry.captureException(err, {
    tags: {
      location: 'splash_screen_prevention',
    },
  });
});

// Set splash screen fade-out animation options (1s fade)
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

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
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, session } = useAuth();
  const navigationRef = useNavigationContainerRef();

  const [fontsLoaded] = useFonts({
    Philosopher: philosopherFont,
    NotoNaskhArabic: madinaFont,
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
      dispatch(setTheme(Theme.Light));
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
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  // Wait for all resources before setting appReady
  useEffect(() => {
    if (fontsLoaded && !isAuthLoading && isLoaded && articlesAndDueWordsLoaded) {
      setAppReady(true);
    }
  }, [fontsLoaded, isAuthLoading, isLoaded, articlesAndDueWordsLoaded]);

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

  // Show nothing until the app is ready
  if (!appReady) {
    return null;
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
      <ThemedText
        type="caption"
        style={{ opacity: LAYOUT.OPACITY.MEDIUM_HIGH }}
      >
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
