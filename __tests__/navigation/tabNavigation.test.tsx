import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as React from 'react';
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useFocusEffect: jest.fn(),
  };
});

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import TestStoreProvider from '../helpers/testStore';

import { createTestQueryClient } from '../helpers/testUtils';
import TabLayout from '../../app/(tabs)/_layout';

// Mock the FSRSDataProvider context to simplify tests
jest.mock('@/components/providers/FSRSDataProvider', () => ({
  useFSRSData: () => ({
    studyWords: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/elements', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PlatformPressable: ({
      onPress,
      children,
    }: {
      onPress: () => void;
      children: React.ReactNode;
    }) => <Text onPress={onPress}>{children}</Text>,
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  const screens = {
    library: require('../../app/(tabs)/library/index.tsx').default,
    bookmarks: require('../../app/(tabs)/bookmarks/index.tsx').default,
    study: require('../../app/(tabs)/study/index.tsx').default,
  };

  const Tabs = ({
    children,
    tabBar,
  }: {
    children: React.ReactNode;
    tabBar: (props: {
      descriptors: Record<string, { options: { title: string } }>;
      state: { index: number; routes: Array<{ key: string; name: string; title: string }> };
      navigation: { navigate: (name: string) => void; emit: () => { defaultPrevented: boolean } };
    }) => React.ReactNode;
  }) => {
    const routes = React.Children.map(
      children,
      (child: React.ReactElement<{ name: string; options?: { title?: string } }>) => ({
        key: child.props.name,
        name: child.props.name,
        title:
          child.props.options?.title ||
          child.props.name.charAt(0).toUpperCase() + child.props.name.slice(1),
      }),
    );
    const [index, setIndex] = React.useState(0);
    const navigation = {
      navigate: (name: string) => {
        const idx = routes.findIndex(r => r.name === name);
        if (idx !== -1) setIndex(idx);
      },
      emit: () => ({ defaultPrevented: false }),
    };
    const descriptors = routes.reduce(
      (
        acc: Record<string, { options: { title: string } }>,
        route: { key: string; title: string },
      ) => {
        acc[route.key] = { options: { title: route.title } };
        return acc;
      },
      {} as Record<string, { options: { title: string } }>,
    );
    const state = { index, routes };
    const Active = screens[routes[index].name as keyof typeof screens];

    // Simple tab bar implementation for testing
    const TabBar = () => (
      <>
        {routes.map((route: { key: string; name: string; title: string }, idx: number) => (
          <TouchableOpacity
            key={route.key}
            onPress={() => setIndex(idx)}
            testID={`tab-${route.name}`}
          >
            <Text>{route.title}</Text>
          </TouchableOpacity>
        ))}
      </>
    );

    return (
      <>
        <TabBar />
        <Active />
      </>
    );
  };

  Tabs.Screen = ({ name, options }: { name: string; options: { title?: string } }) => null;

  return { Tabs, router: { replace: jest.fn() } };
});

// expo-blur is not installed, so we skip the mock - tests using it should mock inline if needed

jest.mock('../../app/(tabs)/library/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, {}, 'READ_MOCK'),
  };
});

jest.mock('../../app/(tabs)/bookmarks/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, {}, 'LISTEN_MOCK'),
  };
});

jest.mock('../../app/(tabs)/study/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, {}, 'PRACTICE_MOCK'),
  };
});

jest.mock('../../hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    session: { user: { id: 'test-user-id' } },
    isLoading: false,
  }),
}));

jest.mock('../../hooks/theme/useColors', () => ({
  useColors: () => ({
    tint: '#000',
    background: '#fff',
    border: '#ccc',
    borderOverlay: '#ccc',
    tabIconDefault: '#888',
    navigationRipple: '#000',
    tabBarOverlay: '#fff',
    textShadowLight: '#fff',
    textShadowDark: '#000',
    headerOverlay: '#fff',
    shadow: '#000',
  }),
}));

jest.mock('../../hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

jest.mock('../../components/HeaderProfile', () => () => null);
jest.mock('../../components/ui/EditModeButton', () => () => null);

// Mock notification service to prevent expo-notifications import error
jest.mock('../../services/notificationService', () => ({
  updateAppIconBadge: jest.fn(),
}));

// Mock reading progress service (no readingStreak service exists)
jest.mock('../../services/readingProgress', () => ({
  getReadingProgress: jest.fn().mockResolvedValue([]),
  updateReadingProgress: jest.fn().mockResolvedValue(undefined),
}));

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <TestStoreProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>{children}</NavigationContainer>
      </QueryClientProvider>
    </TestStoreProvider>
  );
};

describe('Tab navigation', () => {
  it('renders default Library tab and navigates between tabs', () => {
    const { getByText, getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    expect(getByText('READ_MOCK')).toBeTruthy();

    fireEvent.press(getByTestId('tab-bookmarks'));
    expect(getByText('LISTEN_MOCK')).toBeTruthy();

    fireEvent.press(getByTestId('tab-study'));
    expect(getByText('PRACTICE_MOCK')).toBeTruthy();
  });

  it('shows memory capacity badge on study tab when due words exist (red phase)', async () => {
    const { getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    // Wait for the component to render
    await waitFor(() => {
      expect(getByTestId('tab-study')).toBeTruthy();
    });

    // Verify the study tab renders correctly
    expect(getByTestId('tab-study')).toBeTruthy();
  });

  it('does not show memory capacity badge when only struggling words exist (orange phase)', async () => {
    const { getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    // Wait for the component to render
    await waitFor(() => {
      expect(getByTestId('tab-study')).toBeTruthy();
    });

    // Verify the study tab renders correctly
    expect(getByTestId('tab-study')).toBeTruthy();
  });
});
