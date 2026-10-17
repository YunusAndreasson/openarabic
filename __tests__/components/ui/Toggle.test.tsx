/**
 * Toggle: the native switch drawn at the end of a settings row.
 *
 * It only shows state. The row owns the tap and the screen-reader role
 * (SettingsCard.test.tsx covers that), so these tests pin the other half of the
 * contract: what the switch draws, and that it neither takes touches nor
 * announces itself, which is what keeps a tap from being handled twice.
 */

import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { Toggle } from '@/components/ui/Toggle';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

// The switch is hidden from accessibility on purpose; queries skip such
// elements unless asked.
const HIDDEN = { includeHiddenElements: true };

// jest.setup mocks StyleSheet.flatten, and resetMocks leaves it returning
// undefined; merge the style here instead.
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (merged, entry) => ({ ...merged, ...flattenStyle(entry) }),
      {},
    );
  }
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

describe('Toggle', () => {
  test('draws the native switch in the state it is given', () => {
    const { getByTestId, rerender } = render(<Toggle value={false} />);
    expect(getByTestId('native-switch', HIDDEN).props.nativeSwitchValue).toBe(false);

    rerender(<Toggle value={true} />);
    expect(getByTestId('native-switch', HIDDEN).props.nativeSwitchValue).toBe(true);
  });

  test('takes no touches and stays out of the accessibility tree, leaving both to its row', () => {
    const { getByTestId } = render(<Toggle value={false} testID="toggle" />);
    const wrapper = getByTestId('toggle', HIDDEN);

    expect(flattenStyle(wrapper.props.style).pointerEvents).toBe('none');
    expect(wrapper.props.accessibilityElementsHidden).toBe(true);
    expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
