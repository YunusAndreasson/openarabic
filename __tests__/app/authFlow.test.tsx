import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Auth from '../../components/auth';
import TabLayout from '../../app/(tabs)/_layout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestStoreProvider from '../helpers/testStore';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <props.name {...props} />,
}));

jest.mock('@react-navigation/elements', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    PlatformPressable: ({ onPress, children }: any) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Error: 'error' },
}));

jest.mock('@/components/ThemedButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const ThemedButton = ({ title, onPress, disabled, testID }: any) => (
    <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  return { __esModule: true, ThemedButton };
});

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: {} }, isLoading: false }),
}));


jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    tint: '#000',
    background: '#fff',
    icon: '#000',
    text: '#000',
    tabIconSelected: '#f00',
    tabIconDefault: '#888',
    border: '#ccc',
    borderOverlay: '#ccc',
    navigationRipple: '#000',
    tabBarOverlay: '#fff',
    textShadowLight: '#fff',
    textShadowDark: '#000',
  }),
}));

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

jest.mock('@/services/supabase', () => {
  const signInMock = jest.fn();
  const signUpMock = jest.fn();
  const signOutMock = jest.fn();
  return {
    supabase: {
      auth: {
        initialize: jest.fn().mockResolvedValue(undefined),
        startAutoRefresh: jest.fn(),
        signInWithPassword: signInMock,
        signUp: signUpMock,
        signOut: signOutMock,
      },
    },
    __mocks: { signInMock, signUpMock, signOutMock },
  };
});

const {
  __mocks: { signInMock, signUpMock, signOutMock },
} = require('@/services/supabase');

const {
  __mocks: { routerReplaceMock, routerPushMock },
} = require('expo-router');

jest.mock('expo-router', () => {
  const React = require('react');
  const routerReplaceMock = jest.fn();
  const routerPushMock = jest.fn();
  const screens = {
    read: require('../../app/(tabs)/read/index.tsx'),
    listen: require('../../app/(tabs)/listen/index.tsx'),
    practice: require('../../app/(tabs)/practice/index.tsx'),
  };

  const Tabs = ({ children, tabBar }: any) => {
    const routes = React.Children.map(children, (child: any) => ({
      key: child.props.name,
      name: child.props.name,
      options: child.props.options || {},
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
      const title = route.name.charAt(0).toUpperCase() + route.name.slice(1);
      acc[route.key] = { options: { title, ...route.options } };
      return acc;
    }, {} as any);
    const state = { index, routes };
    const Active = screens[routes[index].name as keyof typeof screens];
    const descriptor = descriptors[routes[index].key];
    return (
      <>
        {tabBar && tabBar({ state, descriptors, navigation })}
        {descriptor.options.headerRight && descriptor.options.headerRight()}
        <Active />
      </>
    );
  };

  Tabs.Screen = () => null;

  return { Tabs, router: { replace: routerReplaceMock, push: routerPushMock }, __mocks: { routerReplaceMock, routerPushMock } };
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

jest.mock('../../components/HeaderProfile', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const { router } = require('expo-router');
  return () => (
    <TouchableOpacity testID="profile-btn" onPress={() => router.push('/(tabs)/read/account')}>
      <Text>PROFILE</Text>
    </TouchableOpacity>
  );
});

jest.mock('../../components/listen/EditModeButton', () => () => null);

jest.mock('../../app/(tabs)/read/account/index.tsx', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const { useAccountScreen } = require('@/hooks/account');
  return () => {
    const { handleSignOut } = useAccountScreen();
    return (
      <TouchableOpacity onPress={handleSignOut} testID="sign-out-button">
        <Text>Sign Out</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('@/hooks/account', () => {
  const { supabase } = require('@/services/supabase');
  const { router } = require('expo-router');
  return {
    useAccountScreen: () => ({
      reminderTime: { enabled: false, hour: 0, minute: 0 },
      formatReminderTime: jest.fn(),
      showTimePicker: false,
      handleTimePickerOpen: jest.fn(),
      handleTimePickerClose: jest.fn(),
      handleTimeSet: jest.fn(),
      handleReminderToggle: jest.fn(),
      handleSignOut: async () => {
        await supabase.auth.signOut();
        router.replace('/auth');
      },
      handleSupportContact: jest.fn(),
      handleSocialLink: jest.fn(),
      handleLearningMethodPress: jest.fn(),
      handleClassicalTextsPress: jest.fn(),
      appVersion: '1.0.0',
      currentYear: 2024,
      user: { email: 'user@test.com' },
      handleClearCache: jest.fn(),
      handleClearQueryCache: jest.fn(),
      isClearingCache: false,
      cacheSize: 0,
      queryCacheSize: 0,
    }),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <TestStoreProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestStoreProvider>
  );
};

describe('Auth flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows registration', async () => {
    signUpMock.mockResolvedValueOnce({ data: { user: { id: '1', email: 'test@example.com' } }, error: null });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByPlaceholderText, getByText } = render(<Auth />);

    fireEvent.changeText(getByPlaceholderText('Your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'Password1');

    await act(async () => {
      fireEvent.press(getByText('Create Account'));
    });

    expect(signUpMock).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password1' });
    alertSpy.mockRestore();
  });

  it('shows alert on failed registration', async () => {
    signUpMock.mockResolvedValueOnce({ data: null, error: { message: 'Bad' } });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByPlaceholderText, getByText } = render(<Auth />);

    fireEvent.changeText(getByPlaceholderText('Your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'Password1');

    await act(async () => {
      fireEvent.press(getByText('Create Account'));
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('shows error for weak password', async () => {
    const { getByPlaceholderText, getByText } = render(<Auth />);

    fireEvent.changeText(getByPlaceholderText('Your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'weak');

    await act(async () => {
      fireEvent.press(getByText('Create Account'));
    });

    expect(signUpMock).not.toHaveBeenCalled();
    expect(getByText(/Use at least/)).toBeTruthy();
  });

  it('shows alert on failed login', async () => {
    signInMock.mockResolvedValueOnce({ data: null, error: { message: 'Invalid credentials' } });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByPlaceholderText, getByText } = render(<Auth />);

    fireEvent.press(getByText('Have an account? Sign in'));

    fireEvent.changeText(getByPlaceholderText('Your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'Password1');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    expect(signInMock).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Password1' });
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('logs in and navigates to start page', async () => {
    signInMock.mockResolvedValueOnce({ data: { user: { id: '1', email: 'test@example.com' } }, error: null });
    const { getByPlaceholderText, getByText } = render(<Auth />);

    fireEvent.press(getByText('Have an account? Sign in'));

    fireEvent.changeText(getByPlaceholderText('Your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Your password'), 'Password1');

    await act(async () => {
      fireEvent.press(getByText('Sign In'));
    });

    expect(signInMock).toHaveBeenCalled();
    expect(routerReplaceMock).toHaveBeenCalledWith('/(tabs)/read');
  });
});

describe('App navigation', () => {
  it('shows start page and opens account screen', () => {
    const { getByText, getByTestId } = render(<TabLayout />, { wrapper: createWrapper() });

    expect(getByText('READ_MOCK')).toBeTruthy();

    fireEvent.press(getByTestId('profile-btn'));
    expect(routerPushMock).toHaveBeenCalledWith('/(tabs)/read/account');
  });

  it('logs out from account screen', async () => {
    const AccountScreen = require('../../app/(tabs)/read/account/index.tsx');
    const { getByTestId } = render(<AccountScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('sign-out-button'));
    });

    expect(signOutMock).toHaveBeenCalled();
    expect(routerReplaceMock).toHaveBeenCalledWith('/auth');
  });
});

