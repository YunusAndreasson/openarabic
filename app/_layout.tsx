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
import { useEffect, useState, useCallback, useRef, Component, useMemo } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/themeSlice';
import { useColorScheme, AppState, View, Text, StyleSheet } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { Theme } from '@/constants/Colors';
import Toast, { BaseToast } from 'react-native-toast-message';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger } from 'react-native-reanimated';
import { useAppPreloader } from '../hooks/useAppPreloader';
import { AppLoader } from '@/components/Loader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Hide splash screen immediately
SplashScreen.hideAsync();

// Configure Reanimated logger to disable strict mode
// This will suppress warnings about property "opacity" being overwritten by a layout animation
configureReanimatedLogger({
  strict: false,
});

// Create React Query client with optimized settings and faster startup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Default 1 minute stale time
      gcTime: 300000, // Default 5 minute garbage collection time
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: (failureCount, error: any) => {
        // Don't retry on 404s or auth errors
        if (error?.status === 404 || error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Only retry twice for other errors
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff capped at 10s
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      gcTime: 0, // Don't keep mutation data in cache
    },
  },
});

// Simpler cache cleanup that only runs when needed
if (typeof window !== 'undefined') {
  AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      // Just mark queries as stale - they'll refetch when needed
      queryClient.invalidateQueries();
    }
  });
}

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

  // Memoize navigation theme to prevent recalculation
  const navigationTheme = useMemo(() => (isDark ? DarkTheme : DefaultTheme), [isDark]);

  // Load fonts synchronously since we know they exist
  useFonts({
    Philosopher: require('../assets/fonts/Philosopher-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/Madina.otf'),
  });

  // Use the app preloader hook to preload data
  const { preloadAppData, criticalDataLoaded, preloadComplete } = useAppPreloader();

  // Sync theme with system on first load and changes
  useEffect(() => {
    // Only sync on first load or when no explicit theme is set
    if (colorScheme && !theme) {
      dispatch(setTheme(colorScheme === 'dark' ? Theme.Dark : Theme.Light));
    }
  }, [colorScheme, dispatch, theme]);

  // Watch for app state changes to optimize performance
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'background' && nextAppState === 'active' && appReady) {
        // Invalidate queries and refresh data
        queryClient.invalidateQueries();
        setTimeout(preloadAppData, 300);
      } else if (nextAppState === 'background') {
        Toast.hide();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      Toast.hide();
    };
  }, [appReady, preloadAppData]);

  // Mark app as ready when critical data is loaded
  useEffect(() => {
    if (criticalDataLoaded) {
      setAppReady(true);
      setShowAppLoader(false);
    }
  }, [criticalDataLoaded]);

  // Start resource preparation immediately
  useEffect(() => {
    preloadAppData();
  }, [preloadAppData]);

  // Memoize toast config to prevent recreation
  const toastConfig = useMemo(
    () => ({
      success: (props: React.ComponentProps<typeof BaseToast>) => (
        <BaseToast
          {...props}
          style={[
            styles.toastContainer,
            {
              borderLeftColor: colors.tint,
              backgroundColor: colors.cardBackground,
              borderColor: colors.cardBorder,
            },
          ]}
          contentContainerStyle={styles.toastContent}
          text1Style={[styles.toastTitle, { color: colors.titleText }]}
          text2Style={[styles.toastMessage, { color: colors.text }]}
        />
      ),
    }),
    [colors]
  );

  // Render content immediately since fonts are guaranteed
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="article" options={{ headerShown: false }} />
        <Stack.Screen name="review" options={reviewScreenOptions} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Toast config={toastConfig} />

      {/* Show AppLoader during initialization */}
      {showAppLoader && <AppLoader color={colors.tint} />}
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
    padding: 20,
  },
  errorTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  errorMessage: {
    marginBottom: 20,
  },
  errorDetail: {
    fontSize: 12,
    opacity: 0.7,
  },
  gestureRoot: {
    flex: 1,
  },
  toastContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: '90%',
    height: 'auto',
  },
  toastContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  toastTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  toastMessage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
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
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <AppContent />
              </ErrorBoundary>
            </SafeAreaProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
