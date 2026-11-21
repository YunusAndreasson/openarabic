/**
 * WelcomeIntro — a skip says how it happened.
 *
 * 46 of 60 skips happened on the first slide, and a tap on the backdrop counted
 * as a skip like the Skip button, so some of them were accidents. `method`
 * tells the two apart.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import type React from 'react';

jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/metaEvents', () => ({ metaEvents: { logTutorialComplete: jest.fn() } }));

// The backdrop and the Skip button as plain pressables: what is under test is
// which handler each one reaches, not the Modal around them.
jest.mock('@/components/tutorials/TutorialOverlay', () => {
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    TutorialOverlay: ({
      children,
      onDismiss,
    }: {
      children: React.ReactNode;
      onDismiss: () => void;
    }) => (
      <View>
        <Pressable testID="backdrop" onPress={onDismiss} />
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/tutorials/TutorialCard', () => {
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    TutorialCard: ({ children, onSkip }: { children: React.ReactNode; onSkip?: () => void }) => (
      <View>
        {onSkip ? <Pressable testID="skip" onPress={onSkip} /> : null}
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/tutorials/TutorialStepLayout', () => ({
  TutorialStepLayout: () => null,
}));

import { WelcomeIntro } from '@/components/tutorials/WelcomeIntro';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { analytics } from '@/services/analytics';

const renderIntro = () => {
  const onDismiss = jest.fn();
  const view = render(<WelcomeIntro visible onDismiss={onDismiss} onOpenFirstText={jest.fn()} />);
  return { ...view, onDismiss };
};

describe('WelcomeIntro', () => {
  test('the Skip button is a skip by button', () => {
    const { getByTestId, onDismiss } = renderIntro();

    fireEvent.press(getByTestId('skip'));

    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.ONBOARDING_INTRO_SKIPPED, {
      step_index: 0,
      method: 'button',
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('a tap outside the card is a skip by backdrop', () => {
    const { getByTestId, onDismiss } = renderIntro();

    fireEvent.press(getByTestId('backdrop'));

    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.ONBOARDING_INTRO_SKIPPED, {
      step_index: 0,
      method: 'backdrop',
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
