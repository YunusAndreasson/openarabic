/**
 * The password-reset screen reads its link from the route.
 *
 * `Linking.getInitialURL()` only returns the URL that cold-launched the app, so
 * a reset link tapped while the app was already running — the usual path:
 * "Forgot password", switch to Mail, tap the link — was never read, and the
 * screen bounced to /auth as "invalid or expired".
 */

import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: jest.fn(),
  useRouter: () => ({ replace: mockReplace }),
}));

// A warm start: the app was already running, so the URL that launched it is
// not the reset link. Reading the link from here is the regression.
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(async () => null),
  parse: jest.fn(() => ({ queryParams: {} })),
}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
  showSuccessToast: jest.fn(),
}));

jest.mock('@/utils/haptics', () => ({
  successFeedback: jest.fn(),
}));

jest.mock('@/components/primitives/ThemedView', () => ({
  KEYBOARD_AWARE_SCROLL_PROPS: {},
  ThemedView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/primitives/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

jest.mock('@/components/primitives/ThemedInput', () => {
  const { TextInput } = require('react-native');
  return { ThemedInput: (props: Record<string, unknown>) => <TextInput {...props} /> };
});

jest.mock('@/components/primitives/ThemedButton', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ThemedButton: ({
      title,
      onPress,
      testID,
    }: {
      title: string;
      onPress: () => void;
      testID?: string;
    }) => (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
  };
});

import { useLocalSearchParams } from 'expo-router';

import ResetPasswordScreen from '@/app/reset-password';
import { ROUTE_PATHS } from '@/constants/routes';
import { supabase } from '@/services/supabase';

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    jest.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  test('verifies a recovery link that arrives while the app is already running', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ token: 'hash-123', type: 'recovery' });
    jest.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const { findByTestId } = render(<ResetPasswordScreen />);

    expect(await findByTestId('new-password-input')).toBeTruthy();
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash-123',
      type: 'recovery',
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('without a link or a session, sends the user back to sign in', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(ROUTE_PATHS.AUTH);
    });
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
  });

  test('"Done" on the confirm field submits the new password', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ token: 'hash-123', type: 'recovery' });
    jest.mocked(supabase.auth.verifyOtp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    jest.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.updateUser>>);

    const { findByTestId, getByTestId } = render(<ResetPasswordScreen />);

    fireEvent.changeText(await findByTestId('new-password-input'), 'correct-horse-9');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'correct-horse-9');
    fireEvent(getByTestId('confirm-password-input'), 'submitEditing');

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'correct-horse-9' });
    });
  });
});
