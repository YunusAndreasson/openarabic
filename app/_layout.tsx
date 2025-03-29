import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef, Component, useMemo } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/themeSlice';
import { useColorScheme, AppState, View, Text, StyleSheet } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { Theme } from '@/constants/Colors';
import { useColors } from '@/hooks/useColors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger } from 'react-native-reanimated';
import { useAppPreloader } from '../hooks/useAppPreloader';
import { AppLoader } from '@/components/Loader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { LAYOUT } from '@/constants/layout';

// Hide splash screen immediately
SplashScreen.hideAsync();

// Configure Reanimated logger to disable strict mode
// This will suppress warnings about property "opacity" being overwritten by a layout animation
configureReanimatedLogger({
  strict: false,
});

// Create React Query client with more balanced caching defaults
// Individual queries can override these settings as needed
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Consider data stale after 1 minute
      gcTime: 300000, // Keep unused data in cache for 5 minutes
      refetchOnWindowFocus: true, // Still refetch on focus
      refetchOnMount: true, // Still refetch on mount
      refetchOnReconnect: true, // Still refetch on reconnect
      retry: 1, // Add minimal retry
    },
    mutations: {
      retry: 1, // Add minimal retry for mutations
      gcTime: 0, // No cache for mutations
    },
  },
});

// Static stack options
const stackScreenOptions = {
  headerShown: true,
  animation: 'slide_from_right',
} as const;

const reviewScreenOptions = {
  headerShown: false,
  animation: 'none',
  presentation: 'containedModal',
  gestureEnabled: false,
} as const;

function AppContent() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);
  const isDark = theme === Theme.Dark;
  const colors = useColors();
  const [showAppLoader, setShowAppLoader] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, authError } = useAuth();

  // Memoize navigation theme to prevent recalculation
  const navigationTheme = useMemo(() => (isDark ? DarkTheme : DefaultTheme), [isDark]);

  // Load fonts synchronously since we know they exist
  useFonts({
    Philosopher: require('../assets/fonts/Philosopher-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/Madina.otf'),
  });

  // Use the app preloader hook to preload data
  const { preloadAppData, isLoaded } = useAppPreloader();

  // Add logging to track preloading status
  useEffect(() => {
    console.log('App preloading status:', { isLoaded, isAuthLoading });
  }, [isLoaded, isAuthLoading]);

  // Sync theme with system on first load and changes
  useEffect(() => {
    // Only sync on first load or when no explicit theme is set
    if (colorScheme && !theme) {
      dispatch(setTheme(colorScheme === 'dark' ? Theme.Dark : Theme.Light));
    }
  }, [colorScheme, dispatch, theme]);

  // Start preloading app data after authentication is resolved
  useEffect(() => {
    if (!isAuthLoading) {
      // Authentication is resolved (whether user is logged in or not)
      // This ensures we don't start preloading before auth is complete
      preloadAppData();

      if (authError) {
        console.error('Auth error during app initialization:', authError);
      }
    }
  }, [isAuthLoading, preloadAppData, authError]);

  // Watch for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'background' && nextAppState === 'active' && appReady) {
        // Just trigger preload data when returning to active state
        setTimeout(preloadAppData, 300);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [appReady, preloadAppData]);

  // Mark app as ready when critical data is loaded
  useEffect(() => {
    if (isLoaded) {
      setAppReady(true);
      setShowAppLoader(false);
    }
  }, [isLoaded]);

  // Render content immediately since fonts are guaranteed
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <ToastProvider>
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="article" options={{ headerShown: false }} />
          <Stack.Screen name="review" options={reviewScreenOptions} />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Show AppLoader during initialization */}
        {showAppLoader && <AppLoader color={colors.tint} />}
      </ToastProvider>
    </NavigationThemeProvider>
  );
}

// Custom error boundary implementation
class ErrorBoundary extends Component<
  { children: React.ReactNode; FallbackComponent: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  static defaultState = { hasError: false, error: null };

  state = ErrorBoundary.defaultState;

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  // Only update state if error changes
  shouldComponentUpdate(_: any, nextState: { hasError: boolean; error: Error | null }) {
    if (this.state.hasError !== nextState.hasError) return true;
    if (this.state.error !== nextState.error) return true;
    return false;
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return <this.props.FallbackComponent error={this.state.error} />;
    }
    return this.props.children;
  }
}

interface FallbackProps {
  error: Error;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  errorTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  errorMessage: {
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  errorDetail: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  gestureRoot: {
    flex: 1,
  },
});

function ErrorFallback({ error }: FallbackProps) {
  const colors = useColors();
  return (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorTitle, { color: colors.error }]}>Something went wrong</Text>
      <Text style={[styles.errorMessage, { color: colors.text }]}>Please try again</Text>
      <Text style={[styles.errorDetail, { color: colors.text }]}>{error.toString()}</Text>
    </View>
  );
}

export default function RootLayout() {
  useReactQueryDevTools(queryClient);

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
}
