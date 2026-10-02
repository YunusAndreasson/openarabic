/**
 * An unmatched deep link lands where the app itself would open, never on
 * Expo Router's developer "Unmatched Route" page.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Redirect: jest.fn(() => null),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { Redirect } from 'expo-router';

import NotFoundScreen from '@/app/+not-found';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';

function redirectTarget(): unknown {
  return jest.mocked(Redirect).mock.calls.at(-1)?.[0].href;
}

describe('NotFoundScreen', () => {
  test('sends a signed-in learner to Explore', () => {
    jest.mocked(useAuth).mockReturnValue({ session: {} } as ReturnType<typeof useAuth>);
    render(<NotFoundScreen />);
    expect(redirectTarget()).toBe(ROUTE_PATHS.EXPLORE_TAB);
  });

  test('sends a signed-out visitor to sign in', () => {
    jest.mocked(useAuth).mockReturnValue({ session: null } as ReturnType<typeof useAuth>);
    render(<NotFoundScreen />);
    expect(redirectTarget()).toBe(ROUTE_PATHS.AUTH);
  });
});
