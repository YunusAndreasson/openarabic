/**
 * ScreenErrorFallback Tests
 *
 * The per-screen boundary handed to Expo Router as `unstable_screenErrorBoundary`.
 * Expo Router catches the error before any app-level handler sees it, so this
 * component is the only place it gets reported — which is the part worth
 * asserting, alongside Refresh reaching the router's `retry`.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ScreenErrorFallback } from '@/components/common/ScreenErrorFallback';
import { STRINGS } from '@/constants/strings';
import { handleError } from '@/utils/errorHandling';

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/components/primitives/ThemedText', () => {
  const { Text } = require('react-native');
  const MockReact = require('react');
  return {
    ThemedText: ({ children }: { children: React.ReactNode }) =>
      MockReact.createElement(Text, null, children),
  };
});

jest.mock('@/components/primitives/ThemedButton', () => {
  const { Pressable, Text } = require('react-native');
  const MockReact = require('react');
  return {
    ThemedButton: ({ title, onPress }: { title: string; onPress?: () => void }) =>
      MockReact.createElement(Pressable, { onPress }, MockReact.createElement(Text, null, title)),
  };
});

const mockHandleError = jest.mocked(handleError);

describe('ScreenErrorFallback', () => {
  const error = new Error('render failed');
  const retry = jest.fn(() => Promise.resolve());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tells the user something went wrong', () => {
    const { getByText } = render(<ScreenErrorFallback error={error} retry={retry} />);

    expect(getByText(STRINGS.SOMETHING_WENT_WRONG)).toBeTruthy();
  });

  test('Refresh asks the router to render the screen again', () => {
    const { getByText } = render(<ScreenErrorFallback error={error} retry={retry} />);

    fireEvent.press(getByText(STRINGS.REFRESH));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('reports the caught error once, without a toast', () => {
    const { rerender } = render(<ScreenErrorFallback error={error} retry={retry} />);
    rerender(<ScreenErrorFallback error={error} retry={retry} />);

    expect(mockHandleError).toHaveBeenCalledTimes(1);
    expect(mockHandleError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ showToast: false, sentryTags: { boundary: 'screen' } }),
    );
  });
});
