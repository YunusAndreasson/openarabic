/**
 * Toggle: the native switch drawn at the end of a settings row.
 *
 * It only shows state. The row owns the tap and the screen-reader role
 * (SettingsCard.test.tsx covers that), so these tests pin the other half of the
 * contract: what the switch draws, and that it neither takes touches nor
 * announces itself, which is what keeps a tap from being handled twice.
 */

import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Toggle } from '@/components/ui/Toggle';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

const mockNativeColorScheme = jest.fn<() => 'light' | 'dark'>();
jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useNativeColorScheme: () => mockNativeColorScheme(),
}));

// The switch is hidden from accessibility on purpose; queries skip such
// elements unless asked.
const HIDDEN = { includeHiddenElements: true };

describe('Toggle', () => {
  beforeEach(() => {
    mockNativeColorScheme.mockReturnValue('dark');
  });

  test('draws the native switch in the state it is given', () => {
    const { getByTestId, rerender } = render(<Toggle value={false} />);
    expect(getByTestId('native-switch', HIDDEN).props.nativeSwitchValue).toBe(false);

    rerender(<Toggle value={true} />);
    expect(getByTestId('native-switch', HIDDEN).props.nativeSwitchValue).toBe(true);
  });

  test('takes no touches and stays out of the accessibility tree, leaving both to its row', () => {
    const { getByTestId } = render(<Toggle value={false} testID="toggle" />);
    const wrapper = getByTestId('toggle', HIDDEN);

    expect(StyleSheet.flatten(wrapper.props.style)?.pointerEvents).toBe('none');
    expect(wrapper.props.accessibilityElementsHidden).toBe(true);
    expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  // SwiftUI follows the OS appearance unless the host is told otherwise, and
  // the app's theme is its own setting: on a phone set to Light, the dark
  // theme's switches drew in light-appearance chrome.
  test("draws in the app theme's appearance, not the OS one", () => {
    const { getByTestId, rerender } = render(<Toggle value />);
    expect(getByTestId('native-host', HIDDEN).props.nativeColorScheme).toBe('dark');

    mockNativeColorScheme.mockReturnValue('light');
    rerender(<Toggle value />);
    expect(getByTestId('native-host', HIDDEN).props.nativeColorScheme).toBe('light');
  });
});
