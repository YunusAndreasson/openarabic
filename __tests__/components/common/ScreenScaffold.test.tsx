/**
 * The scaffold's scroll view keeps taps while the keyboard is up.
 *
 * With the ScrollView default ("never") the first tap on a button below a
 * focused input only dismissed the keyboard — and a parent ScrollView's
 * setting wins over a nested one's, so the forms inside could not opt out.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

import { ScreenScaffold } from '@/components/common/ScreenScaffold';

describe('ScreenScaffold', () => {
  test('lets taps through to its content while the keyboard is open', () => {
    const { UNSAFE_getByType } = render(
      <ScreenScaffold>
        <Text>Form</Text>
      </ScreenScaffold>,
    );

    expect(UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  });
});
