/**
 * Global toasts (handleError, showSuccessToast) and nested ToastProviders.
 *
 * The article reader mounts its own provider so its toasts draw above the
 * reader's modal. Unmounting it used to clear the global handler outright,
 * so after the first article closed every error and success toast was
 * dropped for the rest of the session.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { act, render, within } from '@testing-library/react-native';
import { View } from 'react-native';

jest.mock('@/components/ui/Toast', () => {
  const { Text } = require('react-native');
  return {
    Toast: ({ visible, message }: { visible: boolean; message: string }) =>
      visible ? <Text>{message}</Text> : null,
  };
});

jest.mock('@/services/analytics', () => ({
  analytics: { trackError: jest.fn(async () => undefined) },
}));

import { ToastProvider, useToast } from '@/components/providers/ToastProvider';
import { handleError } from '@/utils/errorHandling';

function App({ readerOpen }: { readerOpen: boolean }) {
  return (
    <ToastProvider>
      <View testID="root" />
      {readerOpen ? (
        <View testID="reader">
          <ToastProvider>
            <View />
          </ToastProvider>
        </View>
      ) : null}
    </ToastProvider>
  );
}

const reportError = async (message: string) => {
  await act(async () => {
    await handleError(new Error('boom'), { toastMessage: message, captureSentry: false });
  });
};

describe('ToastProvider', () => {
  // The app's order: the root provider is up long before a reader opens.
  const openReaderLater = () => {
    const view = render(<App readerOpen={false} />);
    view.rerender(<App readerOpen />);
    return view;
  };

  test('a nested provider takes global toasts while it is mounted', async () => {
    const { getByTestId } = openReaderLater();

    await reportError('Shown above the reader');

    expect(within(getByTestId('reader')).getByText('Shown above the reader')).toBeTruthy();
  });

  test('closing it hands global toasts back to the root provider', async () => {
    const { rerender, getByText } = openReaderLater();
    rerender(<App readerOpen={false} />);

    await reportError('Still reaches the learner');

    expect(getByText('Still reaches the learner')).toBeTruthy();
  });

  test('useToast outside a provider names the missing provider', () => {
    const Orphan = () => {
      useToast();
      return null;
    };

    expect(() => render(<Orphan />)).toThrow('useToast must be used within a ToastProvider');
  });
});
