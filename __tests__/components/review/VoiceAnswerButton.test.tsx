/**
 * VoiceAnswerButton Tests
 *
 * The split these tests exist to hold: the button under the card is the
 * ACTION, the card is the STATE. So the button has exactly two labels, and the
 * pipeline's progress ("Preparing voice…", "Listen…", "Opening mic…",
 * "Listening…", "Grading…", "Voice paused", "Microphone is off" — seven of them
 * on one control) is not among them.
 *
 * - two OFFER labels, and which one is showing depends only on whether the mic
 *   is live
 * - the hide rule is now NARROW: a terminal load error still renders nothing,
 *   but a download in progress, a Wi-Fi wait and a refused microphone each
 *   name themselves. Voice ships on by default, so "still downloading" is the
 *   ordinary first-session state, and hiding made the feature look like it did
 *   not exist
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
import type { VoiceReadiness } from '@/utils/voiceReadiness';

const READY: VoiceReadiness = { kind: 'ready' };
const PREPARING: VoiceReadiness = { kind: 'preparing', progress: 0.62 };
const WAITING_WIFI: VoiceReadiness = { kind: 'waiting-wifi' };
const MIC_DENIED: VoiceReadiness = { kind: 'mic-denied' };
const FAILED: VoiceReadiness = { kind: 'failed', reason: 'unknown' };
const OFF: VoiceReadiness = { kind: 'off' };

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/utils/haptics', () => ({ selectionFeedback: jest.fn() }));

const onSpeakNow = jest.fn();
const onStopSpeaking = jest.fn();
const onDownloadOverCellular = jest.fn();
const onEnableMicrophone = jest.fn();

function renderButton(phase: VoicePhase, readiness: VoiceReadiness = READY) {
  const mode = voiceButtonMode(phase, readiness);
  if (mode === null) throw new Error(`expected ${phase} to render a button`);
  return render(
    <VoiceAnswerButton
      mode={mode}
      progress={readiness.kind === 'preparing' ? readiness.progress : 0}
      onSpeakNow={onSpeakNow}
      onStopSpeaking={onStopSpeaking}
      onDownloadOverCellular={onDownloadOverCellular}
      onEnableMicrophone={onEnableMicrophone}
    />,
  );
}

describe('voiceButtonMode', () => {
  test('a resting card invites the answer whenever the learner is ready', () => {
    expect(voiceButtonMode('idle', READY)).toBe('ready');
  });

  test('a playing prompt still invites the answer — the tap cuts the clip short', () => {
    // Being ready before the Arabic finishes is a good thing, so there is no
    // separate "Listen…" state telling the learner to wait through it.
    expect(voiceButtonMode('idle', READY)).toBe('ready');
    expect(voiceButtonMode('result', READY)).toBe('ready');
  });

  test('a live mic offers the way out of it', () => {
    expect(voiceButtonMode('listening', READY)).toBe('live');
  });

  test('opening and grading stand the button down rather than renaming it', () => {
    expect(voiceButtonMode('arming', READY)).toBe('busy');
    expect(voiceButtonMode('checking', READY)).toBe('busy');
  });

  // A model that failed to load leaves the recognizer neither ready nor
  // loading, so the phase effect settles on 'idle' and every rule below it
  // reads that as "invite the answer". Without the readiness input the row
  // offered a full "Speak to answer" that buzzed on tap and then died inside
  // speakNow — on every card of the session. Asserted across the whole union,
  // because 'idle' is merely the phase that error happens to produce.
  test('a terminal load error is never offered, whatever the phase says', () => {
    const every: VoicePhase[] = [
      'idle',
      'loading',
      'arming',
      'listening',
      'checking',
      'result',
      'denied',
    ];
    for (const phase of every) {
      expect(voiceButtonMode(phase, FAILED)).toBeNull();
      expect(voiceButtonMode(phase, OFF)).toBeNull();
    }
  });

  // THE CHANGE. These used to return null, on the argument that an offer which
  // isn't there needs no excuse. That holds for a permanent failure and for a
  // learner who turned voice off — both above — but not for a download, which
  // is temporary and explainable. With voice on by default, hiding during the
  // fetch was indistinguishable from the feature not existing, which is how
  // the accepts were being lost.
  test('a download in progress says so instead of vanishing', () => {
    expect(voiceButtonMode('idle', PREPARING)).toBe('preparing');
    expect(voiceButtonMode('loading', READY)).toBe('preparing');
  });

  test('a Wi-Fi wait says so, because the learner can act on it', () => {
    expect(voiceButtonMode('idle', WAITING_WIFI)).toBe('waiting-network');
  });

  test('a refused microphone says so, because waiting will never fix it', () => {
    expect(voiceButtonMode('idle', MIC_DENIED)).toBe('mic-denied');
    expect(voiceButtonMode('denied', READY)).toBe('mic-denied');
  });

  // Readiness outranks the phase: a recognizer that is still arriving cannot be
  // 'live' or 'busy' no matter what the phase effect last wrote.
  test('readiness outranks a stale phase', () => {
    expect(voiceButtonMode('listening', PREPARING)).toBe('preparing');
    expect(voiceButtonMode('checking', WAITING_WIFI)).toBe('waiting-network');
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
    expect(getByText(STRINGS.VOICE_SPEAK_TO_ANSWER)).toBeTruthy();

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
    expect(getByText(STRINGS.VOICE_SPEAK_TO_ANSWER)).toBeTruthy();
    const button = getByLabelText(STRINGS.VOICE_CHANNEL_LABEL);
    expect(button.props.disabled).toBe(true);
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });

  test('preparing names its progress and refuses the tap', () => {
    // The state that used to render nothing at all. It is deliberately inert —
    // there is no recognizer to open yet — but it holds the slot so the row
    // does not reflow when the model lands mid-session.
    const { getByText, getByLabelText } = renderButton('idle', {
      kind: 'preparing',
      progress: 0.62,
    });
    expect(getByText(STRINGS.VOICE_PREPARING_TEMPLATE(62))).toBeTruthy();
    // The VISIBLE label is short because it has to fit half a row beside
    // "Show answer" — the fuller wording clipped on a Pixel. The spoken label
    // carries the word the short one had to drop.
    const button = getByLabelText(STRINGS.VOICE_PREPARING_A11Y);
    expect(button.props.disabled).toBe(true);
    expect(onSpeakNow).not.toHaveBeenCalled();
  });

  test('a Wi-Fi wait offers the cellular download instead of the mic', () => {
    // 100 MB on someone's data plan is their call, so the offer is explicit and
    // names the size — and it must NOT fall through to opening the microphone.
    const { getByText } = renderButton('idle', { kind: 'waiting-wifi' });
    fireEvent.press(getByText(STRINGS.VOICE_WAITING_WIFI));
    expect(onDownloadOverCellular).toHaveBeenCalledTimes(1);
    expect(onSpeakNow).not.toHaveBeenCalled();
  });

  test('a refused microphone offers the way to fix it', () => {
    const { getByText } = renderButton('idle', { kind: 'mic-denied' });
    expect(getByText(STRINGS.VOICE_ENABLE_MICROPHONE)).toBeTruthy();
    fireEvent.press(getByText(STRINGS.VOICE_ENABLE_MICROPHONE));
    expect(onEnableMicrophone).toHaveBeenCalledTimes(1);
    expect(onSpeakNow).not.toHaveBeenCalled();
  });

  test('tapping while it is listening ends the recording', () => {
    const { getByLabelText } = renderButton('listening');
    fireEvent.press(getByLabelText(STRINGS.VOICE_DONE_SPEAKING));
    expect(onStopSpeaking).toHaveBeenCalledTimes(1);
    // Re-arming here would throw away what the learner just said.
    expect(onSpeakNow).not.toHaveBeenCalled();
  });

  // The primary control of the whole voice exercise used to fire nothing at
  // all. This tick acknowledges the TAP only — the "go" that says the mic is
  // actually capturing belongs to onCapturing, roughly a second later, and the
  // two are deliberately separate beats.
  test('both meanings of the button acknowledge the tap', () => {
    const { selectionFeedback } = require('@/utils/haptics');

    const { getByLabelText } = renderButton('idle');
    fireEvent.press(getByLabelText(STRINGS.VOICE_CHANNEL_LABEL));
    expect(selectionFeedback).toHaveBeenCalledTimes(1);

    const { getByLabelText: getLive } = renderButton('listening');
    fireEvent.press(getLive(STRINGS.VOICE_DONE_SPEAKING));
    expect(selectionFeedback).toHaveBeenCalledTimes(2);
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
