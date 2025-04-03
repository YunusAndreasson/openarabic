import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState, useRef, Component, useMemo } from 'react';
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
import { useAppPreloader } from '../hooks/useAppPreloader';
import { AppLoader } from '@/components/Loader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '@/components/ToastProvider';
import { useAuth } from '../hooks/useAuth';
import { LAYOUT } from '@/constants/layout';
import * as Sentry from '@sentry/react-native';
import { analytics } from '../services/analytics';

Sentry.init({
  dsn: 'https://5ca58a5811a094515e346b0241e6a3f7@o1414696.ingest.us.sentry.io/4509090539831296',

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* Rehydrating, ignore errors */
});

// Create React Query client with more balanced caching defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 1,
      gcTime: 0,
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
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, authError, session } = useAuth();
  const hasHiddenSplash = useRef(false);
  const isInitialMount = useRef(true);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Philosopher: require('../assets/fonts/Philosopher-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/Madina.otf'),
  });

  // Use the app preloader hook to preload data
  const { preloadAppData, isLoaded } = useAppPreloader();

  // Identify user in Mixpanel when auth state changes
  useEffect(() => {
    if (!session?.user || !appReady) return;

    const identifyUser = async () => {
      try {
        await analytics.identify(session.user.id, {
          email: session.user.email,
          last_active: new Date().toISOString(),
        });
      } catch {
        /* Ignore analytics errors */
      }
    };

    identifyUser();
  }, [session, appReady]);

  // Memoize navigation theme to prevent recalculation
  const navigationTheme = useMemo(() => (isDark ? DarkTheme : DefaultTheme), [isDark]);

  // Sync theme with system on first load and changes
  useEffect(() => {
    if (colorScheme && !theme) {
      dispatch(setTheme(colorScheme === 'dark' ? Theme.Dark : Theme.Light));
    }
  }, [colorScheme, dispatch, theme]);

  // Start preloading app data after authentication is resolved
  useEffect(() => {
    if (!isAuthLoading && !isLoaded) {
      preloadAppData();
    }
  }, [isAuthLoading, isLoaded, preloadAppData]);

  // Watch for app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'background' && nextAppState === 'active' && appReady) {
        setTimeout(preloadAppData, 300);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [appReady, preloadAppData]);

  const onLayoutRootView = useCallback(async () => {
    if (!hasHiddenSplash.current && fontsLoaded && isLoaded && !isAuthLoading) {
      hasHiddenSplash.current = true;
      try {
        await SplashScreen.hideAsync();
        // Only set appReady after successfully hiding splash screen
        setAppReady(true);
      } catch {
        /* Ignore splash screen errors */
      }
    }
  }, [fontsLoaded, isLoaded, isAuthLoading]);

  // Don't render anything until initial resources are loaded
  if (!fontsLoaded || !isLoaded || isAuthLoading) {
    return null;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <ToastProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <Stack screenOptions={stackScreenOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="article" options={{ headerShown: false }} />
            <Stack.Screen name="review" options={reviewScreenOptions} />
          </Stack>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {!appReady && <AppLoader color={colors.tint} />}
        </View>
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
  container: {
    flex: 1,
  },
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
