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
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider } from 'react-redux';
import { store, persistor } from '../store/store';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/themeSlice';
import { useColorScheme } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { Theme } from '@/constants/Colors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({});

function AppContent() {
  const colorScheme = useColorScheme();
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector(state => state.theme);
  const isDark = theme === Theme.Dark;
  const [loaded] = useFonts({
    Philosopher: require('../assets/fonts/Philosopher-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/NotoNaskhArabic-Regular.ttf'),
  });

  useEffect(() => {
    // Only sync with system theme on first load
    if (colorScheme && !theme) {
      dispatch(setTheme(colorScheme === 'dark' ? Theme.Dark : Theme.Light));
    }
  }, [colorScheme, dispatch, theme]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="article" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? Theme.Light : Theme.Dark} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useReactQueryDevTools(queryClient);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
