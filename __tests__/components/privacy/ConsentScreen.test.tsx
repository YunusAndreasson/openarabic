/**
 * The consent step and the Privacy choices screen, rendered. The buttons have to
 * hand over the right choices, and refusing has to be as easy as allowing: one
 * tap, on a button that is the same as the one beside it.
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { StyleSheet } from 'react-native';

import { ConsentScreen } from '@/components/privacy/ConsentScreen';
import PrivacyChoicesScreen from '@/app/(tabs)/account/privacy-choices';
import SignedOutPrivacyChoicesScreen from '@/app/auth/privacy-choices';
import { STRINGS } from '@/constants/strings';
import { saveConsent } from '@/services/consent';
import { applyConsentChoices } from '@/services/privacy';

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

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

const mockApply = jest.mocked(applyConsentChoices);

const isChecked = (node: { props: { accessibilityState?: { checked?: boolean } } }) =>
  node.props.accessibilityState?.checked;

describe('ConsentScreen', () => {
  beforeEach(() => {
    mockApply.mockReset();
  });

  test('says what it has to, in the words agreed', () => {
    const { getByText } = render(<ConsentScreen />);

    expect(getByText('Your privacy')).toBeTruthy();
    expect(
      getByText(
        'OpenArabic is free and has no ads. With your permission, we measure how people find and use the app. Because OpenArabic is about Islamic texts, this data could suggest your religious beliefs. You choose, and the app works the same either way.',
      ),
    ).toBeTruthy();
    expect(getByText('App usage')).toBeTruthy();
    expect(
      getByText(
        'Which features get used, linked to your account, so we can improve them. Sent to Mixpanel.',
      ),
    ).toBeTruthy();
    expect(getByText('Ad measurement')).toBeTruthy();
    expect(
      getByText(
        "Whether an ad led someone to install and use the app, so we only pay for ads that help people. Sent to Meta. On Android this includes your device's advertising ID. If App usage is on too, Mixpanel also gets which ad or link it was. We never send Meta your name, your email or what you study.",
      ),
    ).toBeTruthy();
    expect(getByText('Allow both')).toBeTruthy();
    expect(getByText('Refuse both')).toBeTruthy();
    expect(getByText('Save my choices')).toBeTruthy();
    expect(getByText('You can change this at any time in Settings, Privacy choices.')).toBeTruthy();
  });

  test('both toggles start off', () => {
    const { getByTestId } = render(<ConsentScreen />);

    expect(isChecked(getByTestId('consent-toggle-analytics'))).toBe(false);
    expect(isChecked(getByTestId('consent-toggle-measurement'))).toBe(false);
  });

  test('Allow both allows both', () => {
    const { getByTestId } = render(<ConsentScreen />);

    fireEvent.press(getByTestId('consent-allow-both'));

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith({ analytics: true, measurement: true });
  });

  test('refusing takes exactly one tap', () => {
    const { getByTestId } = render(<ConsentScreen />);

    fireEvent.press(getByTestId('consent-refuse-both'));

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith({ analytics: false, measurement: false });
  });

  test('Refuse both refuses whatever the toggles show', () => {
    const { getByTestId } = render(<ConsentScreen />);
    fireEvent.press(getByTestId('consent-toggle-analytics'));
    fireEvent.press(getByTestId('consent-toggle-measurement'));

    fireEvent.press(getByTestId('consent-refuse-both'));

    expect(mockApply).toHaveBeenCalledWith({ analytics: false, measurement: false });
  });

  test('moving a toggle decides nothing yet', () => {
    const { getByTestId } = render(<ConsentScreen />);

    fireEvent.press(getByTestId('consent-toggle-analytics'));

    expect(isChecked(getByTestId('consent-toggle-analytics'))).toBe(true);
    expect(isChecked(getByTestId('consent-toggle-measurement'))).toBe(false);
    expect(mockApply).not.toHaveBeenCalled();
  });

  test.each([
    [[], { analytics: false, measurement: false }],
    [['consent-toggle-analytics'], { analytics: true, measurement: false }],
    [['consent-toggle-measurement'], { analytics: false, measurement: true }],
    [
      ['consent-toggle-analytics', 'consent-toggle-measurement'],
      { analytics: true, measurement: true },
    ],
  ])('Save my choices saves the toggles as set: %j', (toggles, expected) => {
    const { getByTestId } = render(<ConsentScreen />);
    toggles.forEach(testID => fireEvent.press(getByTestId(testID)));

    fireEvent.press(getByTestId('consent-save-choices'));

    expect(mockApply).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledWith(expected);
  });

  test('Allow both and Refuse both are the same size and prominence', () => {
    const { getByTestId } = render(<ConsentScreen />);

    const allow = getByTestId('consent-allow-both');
    const refuse = getByTestId('consent-refuse-both');

    expect(StyleSheet.flatten(allow.props.style)).toEqual(StyleSheet.flatten(refuse.props.style));
  });

  test('Save my choices is the quieter one', () => {
    const { getByTestId } = render(<ConsentScreen />);

    const refuseStyle = StyleSheet.flatten(getByTestId('consent-refuse-both').props.style);
    const saveStyle = StyleSheet.flatten(getByTestId('consent-save-choices').props.style);

    expect(saveStyle).not.toEqual(refuseStyle);
    expect(saveStyle).toMatchObject({ backgroundColor: 'transparent' });
  });
});

describe('PrivacyChoicesScreen', () => {
  beforeEach(() => {
    mockApply.mockReset();
  });

  test('shows the current values, and each change applies at once', async () => {
    await saveConsent({ analytics: true, measurement: false });
    const { getByTestId } = render(<PrivacyChoicesScreen />);

    await waitFor(() => expect(isChecked(getByTestId('consent-toggle-analytics'))).toBe(true));
    expect(isChecked(getByTestId('consent-toggle-measurement'))).toBe(false);

    fireEvent.press(getByTestId('consent-toggle-measurement'));
    expect(mockApply).toHaveBeenLastCalledWith({ analytics: true, measurement: true });

    fireEvent.press(getByTestId('consent-toggle-analytics'));
    expect(mockApply).toHaveBeenLastCalledWith({ analytics: false, measurement: false });
  });

  test('reflects a change as soon as it is saved', async () => {
    await saveConsent({ analytics: true, measurement: false });
    const { getByTestId } = render(<PrivacyChoicesScreen />);

    await saveConsent({ analytics: false, measurement: true });

    await waitFor(() => expect(isChecked(getByTestId('consent-toggle-analytics'))).toBe(false));
    expect(isChecked(getByTestId('consent-toggle-measurement'))).toBe(true);
  });

  test('has no intro of its own to fall out of step with the consent step', () => {
    const { getByText } = render(<PrivacyChoicesScreen />);

    expect(getByText(STRINGS.CONSENT_INTRO)).toBeTruthy();
  });

  test('can be withdrawn from without an account', async () => {
    await saveConsent({ analytics: true, measurement: true });
    const { getByTestId } = render(<SignedOutPrivacyChoicesScreen />);

    fireEvent.press(getByTestId('consent-toggle-measurement'));

    expect(mockApply).toHaveBeenLastCalledWith({ analytics: true, measurement: false });
  });
});
