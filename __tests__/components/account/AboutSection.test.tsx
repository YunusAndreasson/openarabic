/**
 * Where a signed-in person changes their privacy choices. The consent step, the
 * privacy policy and the FAQ all send people here.
 */
import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AboutSection } from '@/components/account/settings/AboutSection';
import { ROUTE_PATHS } from '@/constants/routes';

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

jest.mock('@/utils/openExternalUrl', () => ({ openExternalUrl: jest.fn() }));

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

describe('AboutSection', () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
  });

  test('opens Privacy choices', () => {
    const { getByTestId } = render(<AboutSection />);

    fireEvent.press(getByTestId('settings-privacy-choices'));

    expect(mockRouterPush).toHaveBeenCalledWith(ROUTE_PATHS.ACCOUNT_PRIVACY_CHOICES);
  });
});
