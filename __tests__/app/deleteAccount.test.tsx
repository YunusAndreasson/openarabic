/**
 * The delete-account screen hands the whole flow to useAccountDeletion.
 *
 * It used to call router.back() after `await deleteAccount()`. The hook never
 * throws — it reports a failure and resolves — so a failed deletion popped the
 * screen and threw away the typed "DELETE", and a successful one queued a
 * GO_BACK behind the hook's own replace to /auth.
 */

import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

const mockDeleteAccount = jest.fn<() => Promise<void>>();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/hooks/account/useAccountDeletion', () => ({
  useAccountDeletion: () => ({
    userEmail: 'learner@example.com',
    confirmationText: 'DELETE',
    setConfirmationText: jest.fn(),
    loading: false,
    confirmationError: '',
    deleteAccount: mockDeleteAccount,
  }),
}));

jest.mock('@/components/common', () => ({
  ScreenScaffold: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/primitives/ThemedText', () => {
  const { Text } = require('react-native');
  return { ThemedText: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text> };
});

jest.mock('@/components/primitives/ThemedInput', () => {
  const { TextInput } = require('react-native');
  return {
    ThemedInput: (props: Record<string, unknown>) => (
      <TextInput testID="confirmation-input" {...props} />
    ),
  };
});

jest.mock('@/components/primitives/ThemedButton', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ThemedButton: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <Pressable testID="delete-button" onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
  };
});

import DeleteAccountScreen from '@/app/(tabs)/account/DeleteAccount';

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    // A failed deletion, as the hook reports it: handled, and resolved.
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  test('a failed deletion leaves the screen where it is', async () => {
    const { getByTestId } = render(<DeleteAccountScreen />);

    fireEvent.press(getByTestId('delete-button'));
    // Let anything chained after the deletion run before asserting it did not.
    await act(async () => {});

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  test('submitting from the keyboard runs the same flow', async () => {
    const { getByTestId } = render(<DeleteAccountScreen />);

    fireEvent(getByTestId('confirmation-input'), 'submitEditing');
    // Let anything chained after the deletion run before asserting it did not.
    await act(async () => {});

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });
});
