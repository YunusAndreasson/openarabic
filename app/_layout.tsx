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
import { useEffect, useState, useCallback, useRef } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/themeSlice';
import { useColorScheme, AppState } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { Theme } from '@/constants/Colors';
import Toast, { BaseToast } from 'react-native-toast-message';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { configureReanimatedLogger } from 'react-native-reanimated';
import { useAppPreloader } from '../hooks/useAppPreloader';
import { AppLoader } from '@/components/Loader';

// Immediately hide the splash screen
SplashScreen.preventAutoHideAsync()
  .then(() => {
    SplashScreen.hideAsync().catch(e => {
      console.warn('Error hiding splash screen:', e);
    });
  })
  .catch(e => {
    console.warn('Error with splash screen management:', e);
    // Try to hide it anyway
    SplashScreen.hideAsync().catch(() => {});
  });

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
      retry: 1, // Only retry failed requests once
    },
  },
});

function AppContent() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);
  const isDark = theme === Theme.Dark;
  const colors = useColors();
  const [showAppLoader, setShowAppLoader] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const appState = useRef(AppState.currentState);

  // Load only essential fonts immediately
  const [fontsLoaded, fontError] = useFonts({
    Philosopher: require('../assets/fonts/Philosopher-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/Madina.otf'),
  });

  // Use the app preloader hook to preload data
  const { preloadAppData } = useAppPreloader();

  // Sync theme with system on first load
  useEffect(() => {
    if (colorScheme && !theme) {
      dispatch(setTheme(colorScheme === 'dark' ? Theme.Dark : Theme.Light));
    }
  }, [colorScheme, dispatch, theme]);

  // Watch for app state changes to optimize performance
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // When app comes to foreground, make sure splash is hidden
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        SplashScreen.hideAsync().catch(() => {});

        // Refresh data when coming back to foreground if app was already initialized
        if (appReady) {
          // Use a small delay to ensure UI is responsive first
          setTimeout(() => preloadAppData(), 300);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [appReady, preloadAppData]);

  // Prepare app resources
  const prepareResources = useCallback(async () => {
    try {
      if (fontsLoaded) {
        // Start preloading data and wait for it to complete
        await preloadAppData().catch(e => {
          console.warn('Error preloading app data:', e);
        });

        // Set a small delay before marking app as ready for smoother visual transition
        setTimeout(() => {
          setAppReady(true);

          // Hide our custom loader after a longer transition for smoother animation
          setTimeout(() => {
            setShowAppLoader(false);
          }, 150);
        }, 50);
      }
    } catch (e) {
      console.warn('Error during app initialization:', e);
      setShowAppLoader(false);
    }
  }, [fontsLoaded, preloadAppData]);

  // Handle app initialization as soon as fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      prepareResources();
    }
  }, [fontsLoaded, fontError, prepareResources]);

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

  // Don't render anything until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return <AppLoader color={colors.tint} />;
  }

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

export default function RootLayout() {
  useReactQueryDevTools(queryClient);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
