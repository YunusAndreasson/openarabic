/**
 * ComponentErrorBoundary: contain a render error to one part of a screen.
 *
 * It used to be its own class that reported every error twice — through
 * `handleError` and then its own `captureException` — and dropped React's
 * component stack. It now wraps Sentry's boundary: one capture (the stack rides
 * along), tagged with the part that threw, and an analytics event that does
 * not capture again.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as Sentry from '@sentry/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { ComponentErrorBoundary } from '@/components/common/ComponentErrorBoundary';
import { handleError } from '@/utils/errorHandling';

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

const mockHandleError = jest.mocked(handleError);

/** The mock boundary keeps the scope `beforeCapture` was handed. */
const lastScope = () =>
  (Sentry.ErrorBoundary as unknown as { lastScope: { setTag: jest.Mock } }).lastScope;

let shouldThrow = true;
const Flaky = () => {
  if (shouldThrow) throw new Error('render failed');
  return <Text>recovered</Text>;
};

describe('ComponentErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs every caught render error; the noise says nothing here.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('reports the error to Sentry once, tagged with the part that threw', () => {
    render(
      <ComponentErrorBoundary componentName="AudioPlayer">
        <Flaky />
      </ComponentErrorBoundary>,
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(lastScope().setTag).toHaveBeenCalledWith('component', 'AudioPlayer');
    // The analytics event, without a second Sentry capture.
    expect(mockHandleError).toHaveBeenCalledTimes(1);
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        captureSentry: false,
        showToast: false,
        analyticsEventName: 'Component Error',
        analyticsProperties: { component: 'AudioPlayer' },
      }),
    );
  });

  test('draws an element fallback in place of the part that threw', () => {
    render(
      <ComponentErrorBoundary componentName="AudioPlayer" fallback={<Text>audio fallback</Text>}>
        <Flaky />
      </ComponentErrorBoundary>,
    );

    expect(screen.getByText('audio fallback')).toBeOnTheScreen();
  });

  test('a render-function fallback gets the error and a reset that renders the part again', () => {
    const onError = jest.fn();
    render(
      <ComponentErrorBoundary
        componentName="BottomSheet:word"
        onError={onError}
        fallback={({ error, resetError, componentName }) => (
          <Pressable accessibilityRole="button" onPress={resetError}>
            <Text>{`${componentName}: ${(error as Error).message}`}</Text>
          </Pressable>
        )}
      >
        <Flaky />
      </ComponentErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    shouldThrow = false;
    fireEvent.press(screen.getByText('BottomSheet:word: render failed'));

    expect(screen.getByText('recovered')).toBeOnTheScreen();
  });
});
