/**
 * When the consent step shows. It must wait for the stored choice, so someone who
 * has already decided never sees it flash, and it must not need anything else.
 */
import { act, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { ConsentOverlay } from '@/components/privacy/ConsentOverlay';
import { loadConsent, saveConsent } from '@/services/consent';

jest.mock('@/services/privacy', () => ({
  applyConsentChoices: jest.fn(),
}));

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

describe('ConsentOverlay', () => {
  // One scenario, because the store lives in the module and loading it is one-way.
  test('hidden until the choice has loaded, shown for none, hidden once decided', async () => {
    const { UNSAFE_getByType } = render(<ConsentOverlay />);
    const modal = () => UNSAFE_getByType('Modal' as never);

    expect(modal().props.visible).toBe(false);
    expect(modal().props.presentationStyle).toBe('fullScreen');

    await act(async () => {
      await loadConsent();
    });
    expect(modal().props.visible).toBe(true);

    // Android's back press must not dismiss it into an undecided app.
    expect(modal().props.onRequestClose).toEqual(expect.any(Function));
    act(() => {
      modal().props.onRequestClose();
    });
    expect(modal().props.visible).toBe(true);

    await act(async () => {
      await saveConsent({ analytics: false, measurement: false });
    });
    expect(modal().props.visible).toBe(false);
  });
});
