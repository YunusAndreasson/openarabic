import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// The component to test
import AccountScreen from '../../app/(tabs)/account';

// Mock the Alert directly
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock expo-image before importing the component
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return {
    Image,
    ImageBackground: Image,
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock Linking
jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn((callback: () => void) => callback()),
}));

// Mock Supabase client
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    isLoading: false,
    signOut: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('../../hooks/useColors', () => ({
  useColors: () => ({
    text: '#000000',
    background: '#FFFFFF',
    tint: '#3333FF',
    cardBackground: '#F5F5F5',
    cardBorder: '#E0E0E0',
  }),
}));

// Mock animated components
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    FadeIn: {
      duration: jest.fn(() => ({ delay: jest.fn().mockReturnValue({}) })),
    },
    createAnimatedComponent: jest.fn(component => component),
    View: View,
    default: View,
    Animated: {
      View: View,
    },
  };
});

// Setup for tests
const setupTest = () => {
  // Create a fresh QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  // Mock Redux store
  const store = configureStore({
    reducer: {
      settings: (state = { theme: 'light', fontScale: 1 }, action) => state,
      theme: (state = { theme: 'light' }, action) => state,
    },
  });

  // Render with all providers
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>{ui}</NavigationContainer>
        </QueryClientProvider>
      </Provider>
    );
  };

  return {
    renderWithProviders,
    store,
    queryClient,
  };
};

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user information correctly', () => {
    const { renderWithProviders } = setupTest();
    const { getByText } = renderWithProviders(<AccountScreen />);

    // User information should be displayed
    expect(getByText(/test@example.com/i)).toBeTruthy();
  });

  it('should render sign out button correctly', () => {
    const { renderWithProviders } = setupTest();
    const { getByText } = renderWithProviders(<AccountScreen />);

    // Sign out button should be visible
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('should render support button correctly', () => {
    const { renderWithProviders } = setupTest();
    const { getByText } = renderWithProviders(<AccountScreen />);

    // Support button should be visible
    expect(getByText('Contact Support')).toBeTruthy();
  });

  it('should render social media buttons correctly', () => {
    const { renderWithProviders } = setupTest();
    const { getByText } = renderWithProviders(<AccountScreen />);

    // Social media buttons should be visible
    expect(getByText('Twitter')).toBeTruthy();
    expect(getByText('Instagram')).toBeTruthy();
    expect(getByText('Facebook')).toBeTruthy();
  });
});
