/**
 * Settings needs an account, so this is how someone signed out reaches their
 * privacy choices.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { LegalLinks } from '@/components/auth/LegalLinks';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

describe('LegalLinks', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
  });

  test.each([
    [STRINGS.TERMS_OF_SERVICE, ROUTE_PATHS.AUTH_TERMS],
    [STRINGS.PRIVACY_POLICY, ROUTE_PATHS.AUTH_PRIVACY],
    [STRINGS.PRIVACY_CHOICES, ROUTE_PATHS.AUTH_PRIVACY_CHOICES],
  ])('%s opens its screen', (label, route) => {
    const { getByText } = render(<LegalLinks />);

    fireEvent.press(getByText(label));

    expect(mockRouterPush).toHaveBeenCalledWith(route);
  });
});
