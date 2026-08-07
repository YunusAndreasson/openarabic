/**
 * VoiceChannel Component Tests
 *
 * The channel is the only on-screen representation of voice grading, and its
 * whole reason for existing is that the label it replaced said nothing useful
 * in most states. So the tests are about copy and control:
 *
 * - every phase says something, and the two states that used to share the word
 *   "disabled" (model loading vs. microphone refused) now read differently
 * - a tap gets you to the microphone; a hold takes it over and its release
 *   grades — and a plain tap must NOT grade, because the energy gate owns that
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { VoiceChannel } from '@/components/review/VoiceChannel';
import { STRINGS } from '@/constants/strings';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

/** Stands in for VoiceGradingProvider.micLevel. */
const level = { value: 0, get: () => 0, set: jest.fn(), modify: jest.fn() };

const onSpeakNow = jest.fn();
const onStopSpeaking = jest.fn();

type Props = React.ComponentProps<typeof VoiceChannel>;

function renderChannel(overrides: Partial<Props> = {}) {
  return render(
    <VoiceChannel
      phase="idle"
      level={level as unknown as Props['level']}
      promptPlaying={false}
      paused={false}
      onSpeakNow={onSpeakNow}
      onStopSpeaking={onStopSpeaking}
      {...overrides}
    />,
  );
}

describe('VoiceChannel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('What each state says', () => {
    test('a still-loading recognizer says it is preparing', () => {
      const { getByText } = renderChannel({ phase: 'loading' });
      expect(getByText(STRINGS.VOICE_PREPARING)).toBeTruthy();
    });

    test('a refused microphone says so instead of "preparing"', () => {
      // The whole point of splitting the old `disabled` phase: "preparing"
      // promises a wait that will end, and a denied mic never resolves.
      const { getByText, queryByText } = renderChannel({ phase: 'denied' });
      expect(getByText(STRINGS.VOICE_MIC_OFF)).toBeTruthy();
      expect(queryByText(STRINGS.VOICE_PREPARING)).toBeNull();
    });

    test('arming is named rather than blank', () => {
      const { getByText } = renderChannel({ phase: 'arming' });
      expect(getByText(STRINGS.VOICE_ARMING)).toBeTruthy();
    });

    test('listening asks for the answer', () => {
      const { getByText } = renderChannel({ phase: 'listening' });
      expect(getByText(STRINGS.VOICE_SAY_MEANING)).toBeTruthy();
    });

    test('a paused session says so and takes no input', () => {
      const { getByText, getByLabelText } = renderChannel({ paused: true, promptPlaying: true });
      expect(getByText(STRINGS.VOICE_PAUSED)).toBeTruthy();
      // Paused wins over the prompt state — the mic is muted either way.
      expect(getByLabelText(STRINGS.VOICE_CHANNEL_LABEL).props.accessibilityState.disabled).toBe(
        true,
      );
    });

    test('a playing prompt offers the skip', () => {
      const { getByText } = renderChannel({ promptPlaying: true });
      expect(getByText(STRINGS.VOICE_PROMPT_PLAYING)).toBeTruthy();
      expect(getByText(STRINGS.VOICE_SKIP_PROMPT)).toBeTruthy();
    });

    test('an idle card past its prompt surfaces the escape hatch', () => {
      // This is the card whose automatic arm never happened. It is exactly
      // where a learner would otherwise be stuck, so the hold names itself.
      const { getByText } = renderChannel({ phase: 'idle', promptPlaying: false });
      expect(getByText(STRINGS.VOICE_HOLD_TO_SPEAK)).toBeTruthy();
    });
  });

  describe('Getting to the microphone', () => {
    test('tapping during the prompt asks for the mic now', () => {
      const { getByLabelText } = renderChannel({ promptPlaying: true });
      fireEvent.press(getByLabelText(STRINGS.VOICE_CHANNEL_LABEL));
      expect(onSpeakNow).toHaveBeenCalledTimes(1);
    });

    test('a tap never grades — the energy gate still owns the stop', () => {
      const { getByLabelText } = renderChannel({ promptPlaying: true });
      const channel = getByLabelText(STRINGS.VOICE_CHANNEL_LABEL);
      fireEvent.press(channel);
      fireEvent(channel, 'pressOut');
      expect(onStopSpeaking).not.toHaveBeenCalled();
    });

    test('a hold takes the mic and its release grades', () => {
      const { getByLabelText } = renderChannel({ phase: 'idle' });
      const channel = getByLabelText(STRINGS.VOICE_CHANNEL_LABEL);

      fireEvent(channel, 'longPress');
      expect(onSpeakNow).toHaveBeenCalledTimes(1);

      fireEvent(channel, 'pressOut');
      expect(onStopSpeaking).toHaveBeenCalledTimes(1);
    });

    test('a second release after the hold ended does nothing', () => {
      const { getByLabelText } = renderChannel({ phase: 'idle' });
      const channel = getByLabelText(STRINGS.VOICE_CHANNEL_LABEL);

      fireEvent(channel, 'longPress');
      fireEvent(channel, 'pressOut');
      fireEvent(channel, 'pressOut');

      expect(onStopSpeaking).toHaveBeenCalledTimes(1);
    });
  });
});
