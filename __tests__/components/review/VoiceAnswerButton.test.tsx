/**
 * VoiceAnswerButton Tests
 *
 * The split these tests exist to hold: the button under the card is the
 * ACTION, the card is the STATE. So the button has exactly two labels, and the
 * pipeline's progress ("Preparing voice…", "Listen…", "Opening mic…",
 * "Listening…", "Grading…", "Voice paused", "Microphone is off" — seven of them
 * on one control) is not among them.
 *
 * - two labels, and which one is showing depends only on whether the mic is live
 * - a mic that cannot be used is not offered: paused / refused / still loading
 *   render nothing at all rather than putting an excuse in the primary control
 * - one target, two meanings: tap to open the mic, tap again to end it — and
 *   nothing else, because a second gesture on the same target is what made a
 *   slow tap grade a recording the learner thought they were starting
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { VoiceAnswerButton, voiceButtonMode } from '@/components/review/VoiceAnswerButton';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

const onSpeakNow = jest.fn();
const onStopSpeaking = jest.fn();

function renderButton(phase: VoicePhase) {
  const mode = voiceButtonMode(phase, false);
  if (mode === null) throw new Error(`expected ${phase} to render a button`);
  return render(
    <VoiceAnswerButton mode={mode} onSpeakNow={onSpeakNow} onStopSpeaking={onStopSpeaking} />,
  );
}

describe('voiceButtonMode', () => {
  test('a resting card invites the answer whenever the learner is ready', () => {
    expect(voiceButtonMode('idle', false)).toBe('ready');
  });

  test('a playing prompt still invites the answer — the tap cuts the clip short', () => {
    // Being ready before the Arabic finishes is a good thing, so there is no
    // separate "Listen…" state telling the learner to wait through it.
    expect(voiceButtonMode('idle', false)).toBe('ready');
    expect(voiceButtonMode('result', false)).toBe('ready');
  });

  test('a live mic offers the way out of it', () => {
    expect(voiceButtonMode('listening', false)).toBe('live');
  });

  test('opening and grading stand the button down rather than renaming it', () => {
    expect(voiceButtonMode('arming', false)).toBe('busy');
    expect(voiceButtonMode('checking', false)).toBe('busy');
  });

  // The whole reason those three used to need their own labels was that the
  // button was always rendered. An offer that isn't there needs no excuse —
  // "Show answer" takes the row, and the header's mic toggle is where a paused
  // session is visible and undone.
  test('a mic that cannot be used is not offered at all', () => {
    expect(voiceButtonMode('loading', false)).toBeNull();
    expect(voiceButtonMode('denied', false)).toBeNull();
    // Paused wins over every phase — the mic is muted either way.
    for (const phase of ['idle', 'arming', 'listening', 'checking'] as VoicePhase[]) {
      expect(voiceButtonMode(phase, true)).toBeNull();
    }
  });
});

describe('VoiceAnswerButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tapping a resting card asks for the mic', () => {
    const { getByLabelText } = renderButton('idle');
    fireEvent.press(getByLabelText(STRINGS.VOICE_CHANNEL_LABEL));
    expect(onSpeakNow).toHaveBeenCalledTimes(1);
    expect(onStopSpeaking).not.toHaveBeenCalled();
  });

  test('the label never reports the pipeline — only what you can do next', () => {
    const { getByText, queryByText } = renderButton('idle');
    expect(getByText(STRINGS.VOICE_TAP_TO_ANSWER)).toBeTruthy();

    const { getByText: getLive } = renderButton('listening');
    expect(getLive(STRINGS.VOICE_DONE_SPEAKING)).toBeTruthy();

    // "Listening…" belongs to the card's meter, not to the button.
    expect(queryByText(STRINGS.VOICE_LISTENING)).toBeNull();
  });

  test('busy keeps the resting label and refuses the tap', () => {
    // Grading runs about a second, so the button has to look inert — but it
    // gets there by standing down, not by acquiring a fourth thing to say.
    //
    // Asserted on the prop rather than by pressing: jest.setup stubs Pressable
    // as a host string, so `disabled` blocks nothing in a test and a press
    // would fire onPress either way. This is the contract the real Pressable
    // and a screen reader both read.
    const { getByText, getByLabelText } = renderButton('checking');
    expect(getByText(STRINGS.VOICE_TAP_TO_ANSWER)).toBeTruthy();
    const button = getByLabelText(STRINGS.VOICE_CHANNEL_LABEL);
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  test('tapping while it is listening ends the recording', () => {
    const { getByLabelText } = renderButton('listening');
    fireEvent.press(getByLabelText(STRINGS.VOICE_DONE_SPEAKING));
    expect(onStopSpeaking).toHaveBeenCalledTimes(1);
    // Re-arming here would throw away what the learner just said.
    expect(onSpeakNow).not.toHaveBeenCalled();
  });

  // Regression: hold-to-talk shared this target with the tap, so a deliberate
  // press that ran a shade long became a hold and its release graded a
  // recording the learner thought they were still starting.
  test('a long press is just a press — there is no hold gesture', () => {
    const { getByLabelText } = renderButton('idle');
    const button = getByLabelText(STRINGS.VOICE_CHANNEL_LABEL);

    fireEvent(button, 'longPress');
    fireEvent(button, 'pressOut');

    expect(onStopSpeaking).not.toHaveBeenCalled();
  });
});
