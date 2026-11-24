import { expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import TabLayout from '@/app/(tabs)/_layout';
import { ROUTE_PATHS } from '@/constants/routes';

const mockPublicScreen = jest.fn<(name: string) => void>();
const mockPrivateScreen = jest.fn<(name: string, redirectTo: string) => void>();
jest.mock('expo-router', () => {
  const { Children } = require('react') as typeof import('react');
  function Stack({ children }: { children: ReactNode }) {
    return children;
  }
  Stack.Screen = ({ name }: { name: string }) => {
    mockPublicScreen(name);
    return null;
  };
  Stack.Protected = ({
    guard,
    redirectTo,
    children,
  }: {
    guard: boolean;
    redirectTo: string;
    children: ReactNode;
  }) => {
    if (guard) return children;
    Children.forEach(children, child => {
      if (child && typeof child === 'object' && 'props' in child) {
        mockPrivateScreen((child.props as { name: string }).name, redirectTo);
      }
    });
    return null;
  };
  return { Stack };
});
jest.mock('@/hooks/auth', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useDueWordsCount: () => {
    throw new Error('Guest mounted a study query');
  },
}));
test('guest Browse mounts only Explore and sends private tab entries to authentication', () => {
  render(<TabLayout />);
  expect(mockPublicScreen.mock.calls).toEqual([['explore']]);
  expect(mockPrivateScreen.mock.calls).toEqual([
    ['practice', ROUTE_PATHS.AUTH],
    ['playlist', ROUTE_PATHS.AUTH],
    ['account', ROUTE_PATHS.AUTH],
  ]);
});
