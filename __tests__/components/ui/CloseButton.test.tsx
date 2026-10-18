/**
 * CloseButton Component Tests
 *
 * The close button goes back on the press itself. It used to defer
 * `router.back()` by 60ms to let a press animation land, but the header button
 * underneath has no press animation, so the delay only added latency.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { router } from 'expo-router';
import React from 'react';

import { CloseButton } from '@/components/ui/CloseButton';
import { STRINGS } from '@/constants/strings';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

const mockBack = jest.mocked(router.back);

describe('CloseButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('goes back on the press itself, with nothing scheduled', () => {
    const { getByLabelText } = render(<CloseButton />);

    fireEvent.press(getByLabelText(STRINGS.CLOSE_A11Y));

    // No timers have been advanced, so a deferred back() would not have run.
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('runs a supplied handler instead of going back', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<CloseButton onPress={onPress} />);

    fireEvent.press(getByLabelText(STRINGS.CLOSE_A11Y));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });

  test('announces the label it is given', () => {
    const { getByLabelText } = render(<CloseButton accessibilityLabel="Close word" />);

    expect(getByLabelText('Close word')).toBeTruthy();
  });
});
