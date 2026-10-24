/**
 * VoiceListeningIndicator Tests
 *
 * The other half of the button/card split: this is where the microphone's
 * state lives now. What matters is that it appears for exactly the three beats
 * the mic is working, that it mostly SHOWS rather than tells, and that the one
 * beat a meter genuinely cannot narrate — grading, where the bars are frozen —
 * still says so.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import {
  VoiceListeningIndicator,
  voiceIndicatorState,
} from '@/components/review/VoiceListeningIndicator';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

/** Stands in for VoiceGradingProvider.micLevel. */
const level = { value: 0, get: () => 0, set: jest.fn(), modify: jest.fn() };

type Props = React.ComponentProps<typeof VoiceListeningIndicator>;

function renderIndicator(state: Props['state']) {
  return render(
    <VoiceListeningIndicator state={state} level={level as unknown as Props['level']} />,
  );
}

describe('voiceIndicatorState', () => {
  test('shows only while the microphone is actually working', () => {
    expect(voiceIndicatorState('arming')).toBe('opening');
    expect(voiceIndicatorState('listening')).toBe('live');
    expect(voiceIndicatorState('checking')).toBe('grading');
  });

  // An idle card shows its replay control in this slot; the states that mean
  // "the mic will not be working" show nothing rather than explaining.
  test('every other phase yields the slot back', () => {
    const quiet: VoicePhase[] = ['idle', 'result', 'loading', 'denied'];
    for (const phase of quiet) {
      expect(voiceIndicatorState(phase)).toBeNull();
    }
  });
});

describe('VoiceListeningIndicator', () => {
  // "Opening mic…" was the app talking about itself. A breathing meter says the
  // same thing and then becomes the live meter without changing shape.
  test('opening the mic is wordless', () => {
    const { queryByText } = renderIndicator('opening');
    expect(queryByText(STRINGS.VOICE_LISTENING)).toBeNull();
    expect(queryByText(STRINGS.VOICE_CHECKING)).toBeNull();
  });

  // The opening breath is opacity only — the substitution Reduce Motion asks
  // for, not motion it removes. It used to be dropped, which left a still grey
  // row of stubs while the mic opened.
  test('the opening breath plays under Reduce Motion too', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    const { toJSON } = renderIndicator('opening');

    const json = toJSON() as unknown as { children: { props: { style: unknown } }[] };
    const barRow = [json.children[0]?.props.style].flat(Infinity);
    expect(barRow).toContainEqual(expect.objectContaining({ animationIterationCount: 'infinite' }));
  });

  test('a live mic names itself once, on the card', () => {
    const { getByText } = renderIndicator('live');
    expect(getByText(STRINGS.VOICE_LISTENING)).toBeTruthy();
  });

  // The bars are frozen through grading, and frozen bars with no caption read
  // as a hang.
  test('grading says so, because a still meter cannot', () => {
    const { getByText } = renderIndicator('grading');
    expect(getByText(STRINGS.VOICE_CHECKING)).toBeTruthy();
  });
});
