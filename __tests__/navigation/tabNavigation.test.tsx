import { fireEvent, render } from '@testing-library/react-native';
import * as React from 'react';
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestStoreProvider from '../helpers/testStore';

import TabLayout from '../../app/(tabs)/_layout';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/elements', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PlatformPressable: ({ onPress, children }: any) => <Text onPress={onPress}>{children}</Text>,
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  const screens = {
    read: require('../../app/(tabs)/read/index.tsx'),
    listen: require('../../app/(tabs)/listen/index.tsx'),
    practice: require('../../app/(tabs)/practice/index.tsx'),
  };

  const Tabs = ({ children, tabBar }: any) => {
    const routes = React.Children.map(children, (child: any) => ({
      key: child.props.name,
      name: child.props.name,
      title:
        child.props.options?.title ||
        child.props.name.charAt(0).toUpperCase() + child.props.name.slice(1),
    }));
    const [index, setIndex] = React.useState(0);
    const navigation = {
      navigate: (name: string) => {
        const idx = routes.findIndex(r => r.name === name);
        if (idx !== -1) setIndex(idx);
      },
      emit: () => ({ defaultPrevented: false }),
    };
    const descriptors = routes.reduce((acc: any, route: any) => {
      acc[route.key] = { options: { title: route.title } };
      return acc;
    }, {} as any);
    const state = { index, routes };
    const Active = screens[routes[index].name as keyof typeof screens];

    // Simple tab bar implementation for testing
    const TabBar = () => (
      <>
        {routes.map((route: any, idx: number) => (
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

  Tabs.Screen = ({ name, options }: any) => null;

  return { Tabs, router: { replace: jest.fn() } };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  return {
    BlurView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('../../app/(tabs)/read/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>READ_MOCK</Text>;
});

jest.mock('../../app/(tabs)/listen/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>LISTEN_MOCK</Text>;
});

jest.mock('../../app/(tabs)/practice/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return () => <Text>PRACTICE_MOCK</Text>;
});

jest.mock('../../hooks/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: {} }, isLoading: false }),
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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <TestStoreProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>{children}</NavigationContainer>
      </QueryClientProvider>
    </TestStoreProvider>
  );
};

describe('Tab navigation', () => {
  it('renders default Read tab and navigates between tabs', () => {
    const { getByText } = render(<TabLayout />, { wrapper: createWrapper() });

    expect(getByText('READ_MOCK')).toBeTruthy();

    fireEvent.press(getByText('Playlist'));
    expect(getByText('LISTEN_MOCK')).toBeTruthy();

    fireEvent.press(getByText('Practice'));
    expect(getByText('PRACTICE_MOCK')).toBeTruthy();
  });
});
