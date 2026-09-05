import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { Platform } from 'react-native';

// Default Platform.OS to 'android' for these tests; the NativeTabs mock below
// behaves identically across platforms so the choice is mostly cosmetic.
jest
  .spyOn(Platform, 'select')
  .mockImplementation(
    obj => (obj as Record<string, unknown>).android ?? (obj as Record<string, unknown>).default,
  );
Object.defineProperty(Platform, 'OS', { get: () => 'android' });

// Mock expo-router/unstable-native-tabs before it's imported by TabLayout
jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  // Lazy: the tabs layout imports expo-router modules whose mock factories
  // would otherwise re-enter mid-initialization (circular module init).
  const getScreens = () =>
    ({
      explore: require('../../app/(tabs)/explore/index.tsx').default,
      playlist: require('../../app/(tabs)/playlist/index.tsx').default,
      practice: require('../../app/(tabs)/practice/index.tsx').default,
    }) as Record<string, React.ComponentType>;

  const NativeTabs = ({ children }: { children: React.ReactNode }) => {
    const triggers = React.Children.toArray(children).filter(
      (child: any) => child?.props?.name,
    ) as Array<
      React.ReactElement<{
        name: string;
        children: React.ReactNode;
        accessibilityLabel?: string;
      }>
    >;

    const [activeName, setActiveName] = React.useState(triggers[0]?.props.name ?? 'explore');
    const Active = getScreens()[activeName];

    const tabBar = triggers.map(child => {
      // expo-router does NOT render a Trigger's children: `convertTabPropsToOptions`
      // walks `props.children` and keeps only elements whose `type` is IDENTICAL to
      // the Icon / Label / Badge components it exports. Use its own filter here so a
      // wrapper component around an icon (which renders fine but fails the identity
      // check, and ships a tab bar with no icons) fails this suite instead of the
      // App Store build.
      const {
        filterAllowedChildrenElements,
        isChildOfType,
      } = require('expo-router/build/utils/children');
      const kids = filterAllowedChildrenElements(child.props.children, [
        Trigger.Badge,
        Trigger.Label,
        Trigger.Icon,
      ]);

      const labelChild = kids.find((c: any) => isChildOfType(c, Trigger.Label)) as
        React.ReactElement<{ children: string }> | undefined;
      const title =
        typeof labelChild?.props?.children === 'string'
          ? labelChild.props.children
          : child.props.name;
      // The badge is real app-passed content (see app/(tabs)/_layout.tsx), not
      // mock chrome — render it so tests can assert on it, same as the label.
      const badgeChild = kids.find((c: any) => isChildOfType(c, Trigger.Badge)) as
        React.ReactElement<{ children: React.ReactNode }> | undefined;
      const iconChild = kids.find((c: any) => isChildOfType(c, Trigger.Icon)) as
        React.ReactElement<{ sf?: { default: string } }> | undefined;

      return React.createElement(
        TouchableOpacity,
        {
          key: child.props.name,
          testID: `tab-${child.props.name}`,
          accessibilityLabel: child.props.accessibilityLabel,
          onPress: () => setActiveName(child.props.name),
        },
        React.createElement(Text, null, title),
        iconChild
          ? React.createElement(
              Text,
              { testID: `tab-icon-${child.props.name}` },
              iconChild.props.sf?.default ?? '',
            )
          : null,
        badgeChild,
      );
    });

    return React.createElement(
      React.Fragment,
      null,
      ...tabBar,
      Active && React.createElement(Active),
    );
  };

  const Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement('View', null, children);
  Trigger.Icon = () => null;
  const Label = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);
  (Label as any).displayName = 'NativeTabsLabel';
  Trigger.Label = Label;
  Trigger.Badge = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, { testID: 'tab-badge' }, children);
  Trigger.VectorIcon = () => null;
  NativeTabs.Trigger = Trigger;
  return { NativeTabs };
});

// SDK 56 consolidated @react-navigation/native + /elements re-exports under
// expo-router/react-navigation. Merge the two old mocks targeting that path.
jest.mock('expo-router/react-navigation', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useFocusEffect: jest.fn(),
    PlatformPressable: ({
      onPress,
      children,
    }: {
      onPress: () => void;
      children: React.ReactNode;
    }) => <Text onPress={onPress}>{children}</Text>,
  };
});

import { NavigationContainer } from 'expo-router/react-navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import TestStoreProvider from '../helpers/testStore';

import { createTestQueryClient } from '../helpers/testUtils';
import TabLayout from '../../app/(tabs)/_layout';

// The layout subscribes only to the primitive count its badge needs.
const mockUseDueWordsCount = jest.fn();
jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useDueWordsCount: (...args: unknown[]) => mockUseDueWordsCount(...args),
}));

jest.mock('@/components/ui/Icon', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  // Lazy: the tabs layout itself imports 'expo-router', so requiring the
  // screens eagerly here would re-enter this factory mid-initialization
  // (circular module init → jest-util warning-proxy stack overflow).
  const getScreens = () =>
    ({
      explore: require('../../app/(tabs)/explore/index.tsx').default,
      playlist: require('../../app/(tabs)/playlist/index.tsx').default,
      practice: require('../../app/(tabs)/practice/index.tsx').default,
    }) as Record<string, React.ComponentType>;

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
        const idx = routes.findIndex((r: { name: string }) => r.name === name);
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
    const Active = getScreens()[routes[index].name];

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

  return {
    Tabs,
    router: { replace: jest.fn(), navigate: jest.fn() },
    usePathname: () => '/explore',
  };
});

// expo-blur is not installed, so we skip the mock - tests using it should mock inline if needed

jest.mock('../../app/(tabs)/explore/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, {}, 'READ_MOCK'),
  };
});

jest.mock('../../app/(tabs)/playlist/index.tsx', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => React.createElement(Text, {}, 'LISTEN_MOCK'),
  };
});

jest.mock('../../app/(tabs)/practice/index.tsx', () => {
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
    tabLabelSelected: '#000',
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

jest.mock('../../components/playlist/EditModeButton', () => () => null);

// Mock notification service to prevent expo-notifications import error
jest.mock('../../services/notificationService', () => ({
  updateAppIconBadge: jest.fn(),
}));

// Mock reading progress service (no readingStreak service exists)
jest.mock('../../services/readingProgress', () => ({
  getReadingProgress: jest.fn(async (..._args: unknown[]) => []),
  updateReadingProgress: jest.fn(async (..._args: unknown[]) => undefined),
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

// Asserted rather than read back from TAB_SCREENS: a test that looks up the same
// table the layout does would pass even if the table itself were wrong.
const TAB_ICONS_BY_TAB = {
  explore: 'safari',
  playlist: 'headphones',
  practice: 'graduationcap',
  account: 'gearshape',
} as const;

describe('Tab navigation', () => {
  beforeEach(() => {
    mockUseDueWordsCount.mockReturnValue(0);
  });

  test('renders default Explore tab and navigates between tabs', () => {
    const { getByText, getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    expect(getByText('READ_MOCK')).toBeDefined();

    fireEvent.press(getByTestId('tab-playlist'));
    expect(getByText('LISTEN_MOCK')).toBeDefined();

    fireEvent.press(getByTestId('tab-practice'));
    expect(getByText('PRACTICE_MOCK')).toBeDefined();
  });

  test('gives every tab an icon expo-router will actually read', () => {
    // Regression: the icon was moved into a memoised <TabIcon /> wrapper. It
    // rendered correctly in isolation, but expo-router matches Trigger children
    // by element identity and never renders them, so all three icons were
    // dropped and iOS shipped a label-only tab bar.
    const { getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    expect(getByTestId('tab-icon-explore')).toHaveTextContent(TAB_ICONS_BY_TAB.explore);
    expect(getByTestId('tab-icon-playlist')).toHaveTextContent(TAB_ICONS_BY_TAB.playlist);
    expect(getByTestId('tab-icon-practice')).toHaveTextContent(TAB_ICONS_BY_TAB.practice);
    expect(getByTestId('tab-icon-account')).toHaveTextContent(TAB_ICONS_BY_TAB.account);
  });

  test('parks Account in the rightmost slot', () => {
    // Order is the whole point of the tab: settings is the destination a
    // learner needs least, so it takes the corner and Explore keeps the
    // reachable end. Read off the rendered bar rather than off TAB_SCREENS,
    // which is the table the layout itself maps over.
    const { getAllByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    const renderedOrder = getAllByTestId(/^tab-(explore|playlist|practice|account)$/).map(
      tab => tab.props.testID,
    );

    expect(renderedOrder).toEqual(['tab-explore', 'tab-playlist', 'tab-practice', 'tab-account']);
  });

  test('shows memory capacity badge on practice tab when due words exist', async () => {
    mockUseDueWordsCount.mockReturnValue(3);

    const { getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getByTestId('tab-badge')).toBeDefined();
    });
    expect(getByTestId('tab-badge').props.children).toBe('3');
    expect(getByTestId('tab-practice').props.accessibilityLabel).toBe('Practice');
  });

  test('keeps the practice label stable while the native badge supplies its due-word meaning', () => {
    mockUseDueWordsCount.mockReturnValue(1);

    const { getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    expect(getByTestId('tab-practice').props.accessibilityLabel).toBe('Practice');
  });

  test('does not show memory capacity badge when no words are due', async () => {
    const { getByTestId, queryByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(getByTestId('tab-practice')).toBeDefined();
    });

    expect(queryByTestId('tab-badge')).toBeNull();
  });
});
