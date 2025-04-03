import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useCallback,
  useEffect,
  useState,
  useRef,
  Component,
  useMemo,
  createContext,
  useContext,
} from 'react';
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
import philosopherFont from '../assets/fonts/Philosopher-Regular.ttf';
import madinaFont from '../assets/fonts/Madina.otf';

// Create navigation integration for Sentry
const navigationIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: 'https://5ca58a5811a094515e346b0241e6a3f7@o1414696.ingest.us.sentry.io/4509090539831296',
  integrations: [navigationIntegration],
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

// App loading context type
interface AppLoadingContextType {
  initialLoadComplete: boolean;
  wasPreloaded: boolean;
}

// Create context with default values
export const AppLoadingContext = createContext<AppLoadingContextType>({
  initialLoadComplete: false,
  wasPreloaded: false,
});

// Hook to use the app loading context
export const useAppLoading = () => useContext(AppLoadingContext);

function AppContent() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);
  const isDark = theme === Theme.Dark;
  const colors = useColors();
  const [appReady, setAppReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const appState = useRef(AppState.currentState);
  const { isLoading: isAuthLoading, session } = useAuth();
  const hasHiddenSplash = useRef(false);
  const navigationRef = useNavigationContainerRef();

  // Load fonts
  const [fontsLoaded] = useFonts({
    Philosopher: philosopherFont,
    NotoNaskhArabic: madinaFont,
  });

  // Use the app preloader hook to preload data
  const { preloadAppData, isLoaded } = useAppPreloader();

  // Make this available to child components via context
  const appLoadingContext = useMemo(
    () => ({
      initialLoadComplete: appReady,
      wasPreloaded: isLoaded,
    }),
    [appReady, isLoaded]
  );

  // Identify user in Mixpanel when auth state changes
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
      } catch {
        /* Ignore analytics errors */
      }
    };

    identifyUser();
  }, [session, appReady, isAuthLoading]);

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
        // Hide loader after a small delay to ensure smooth transition
        setTimeout(() => {
          setShowLoader(false);
          setAppReady(true);
        }, 100);
      } catch {
        /* Ignore splash screen errors */
        setShowLoader(false);
        setAppReady(true);
      }
    }
  }, [fontsLoaded, isLoaded, isAuthLoading]);

  // Register navigation container with Sentry
  useEffect(() => {
    if (navigationRef?.current) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  // Don't render anything until initial resources are loaded
  if (!fontsLoaded || !isLoaded || isAuthLoading) {
    return <AppLoader color={colors.tint} />;
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <ToastProvider>
        <AppLoadingContext.Provider value={appLoadingContext}>
          <View style={styles.container} onLayout={onLayoutRootView}>
            {!showLoader ? (
              <>
                <Stack ref={navigationRef} screenOptions={stackScreenOptions}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="article" options={{ headerShown: false }} />
                  <Stack.Screen name="review" options={reviewScreenOptions} />
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
  shouldComponentUpdate(
    _prevProps: unknown,
    nextState: { hasError: boolean; error: Error | null }
  ) {
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
