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
import { useEffect, useState, useCallback, useRef, Component } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/themeSlice';
import { useColorScheme, AppState, View, Text } from 'react-native';
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

// Add cache cleanup on app state change
if (typeof window !== 'undefined') {
  AppState.addEventListener('change', nextAppState => {
    if (nextAppState === 'active') {
      // Remove stale data when app comes to foreground
      queryClient.invalidateQueries({
        predicate: query => {
          const queryState = query.state;
          return Date.now() - queryState.dataUpdatedAt > 60000; // Invalidate if older than 1 minute
        },
      });
    }
  });
}

function AppContent() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);
  const isDark = theme === Theme.Dark;
  const colors = useColors();
  const [showAppLoader, setShowAppLoader] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);

  // Load fonts synchronously since we know they exist
  useFonts({
    Philosopher: require('../assets/fonts/Philosopher-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/Madina.otf'),
  });

  // Use the app preloader hook to preload data
  const { preloadAppData, criticalDataLoaded, preloadComplete } = useAppPreloader();

  // Sync theme with system on first load and changes
  useEffect(() => {
    if (!colorScheme) return; // Skip if colorScheme is not available

    // Only update theme if it's not set or if system theme changes and we're in auto mode
    const isAutoTheme = !theme; // No theme set means auto
    if (isAutoTheme) {
      const newTheme = colorScheme === 'dark' ? Theme.Dark : Theme.Light;
      if (newTheme !== theme) {
        dispatch(setTheme(newTheme));
      }
    }
  }, [colorScheme, dispatch, theme]);

  // Watch for app state changes to optimize performance
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const subscription = AppState.addEventListener('change', nextAppState => {
      // When app comes to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Refresh data when coming back to foreground if app was already initialized
        if (appReady) {
          // Use a small delay to ensure UI is responsive first
          timeoutId = setTimeout(() => preloadAppData(), 300);
        }
      } else if (nextAppState === 'background') {
        // Hide any active toasts when app goes to background
        Toast.hide();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Clean up any remaining toasts
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

  const toastConfig = {
    success: (props: React.ComponentProps<typeof BaseToast>) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: colors.tint,
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
          width: '90%',
          height: 'auto',
        }}
        contentContainerStyle={{
          paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          paddingVertical: LAYOUT.SPACING.MEDIUM,
        }}
        text1Style={{
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
          fontWeight: '600',
          color: colors.titleText,
        }}
        text2Style={{
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
          color: colors.text,
        }}
      />
    ),
  };

  // Render content immediately since fonts are guaranteed
  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="article" options={{ headerShown: false }} />
        <Stack.Screen
          name="review"
          options={{
            headerShown: false,
            animation: 'none',
            presentation: 'containedModal',
            gestureEnabled: false,
          }}
        />
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
  constructor(props: {
    children: React.ReactNode;
    FallbackComponent: React.ComponentType<{ error: Error }>;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
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

function ErrorFallback({ error }: FallbackProps) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ color: colors.error, fontSize: 16, marginBottom: 10 }}>
        Something went wrong
      </Text>
      <Text style={{ color: colors.text, marginBottom: 20 }}>Please try again</Text>
      <Text style={{ color: colors.text, fontSize: 12, opacity: 0.7 }}>{error.toString()}</Text>
    </View>
  );
}

export default function RootLayout() {
  useReactQueryDevTools(queryClient);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
