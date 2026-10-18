/**
 * The voice result row shares the bottom band with the grade bar, one after
 * the other on the same card, so the two must agree on where fail and pass sit
 * and on what a colour means there.
 */
import { fireEvent, render } from '@testing-library/react-native';

import { VoiceResultPanel } from '@/components/review/VoiceResultPanel';
import { STRINGS } from '@/constants/strings';

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    error: '#ff0000',
    warning: '#ffff00',
    success: '#00ff00',
    secondaryText: '#999999',
    text: '#ffffff',
    card: '#111111',
  }),
}));
jest.mock('@/components/primitives/ThemedText', () => ({
  ThemedText: require('react-native').Text,
}));
jest.mock('@/utils/haptics', () => ({ selectionFeedback: jest.fn() }));

const haptics = jest.requireMock('@/utils/haptics') as { selectionFeedback: jest.Mock };

const renderPanel = (missMarked = true) => {
  const handlers = { onAccept: jest.fn(), onReject: jest.fn(), onRetry: jest.fn() };
  const view = render(<VoiceResultPanel {...handlers} missMarked={missMarked} />);
  return { view, handlers };
};

test('fail sits left and pass sits right, matching the grade bar', () => {
  const { view } = renderPanel();

  // By label rather than role: the jest Pressable mock is not an accessible host
  // element, so a role query finds nothing. Tree order is screen order.
  const labels = view.getAllByLabelText(/.+/).map(button => button.props.accessibilityLabel);

  expect(labels).toEqual([
    STRINGS.VOICE_RESULT_REJECT,
    STRINGS.VOICE_RESULT_RETRY,
    STRINGS.VOICE_RESULT_ACCEPT,
  ]);
});

// Amber is "Barely" in the grade bar. A retry grades nothing, so it wears the
// neutral ink instead of a grade's hue.
test('"Try again" is neutral, not a grade colour', () => {
  const { view } = renderPanel();

  expect(view.getByText(STRINGS.VOICE_RESULT_RETRY).props.style).toEqual({ color: '#999999' });
  expect(view.getByText(STRINGS.VOICE_RESULT_REJECT_SHORT).props.style).toEqual({
    color: '#ff0000',
  });
  expect(view.getByText(STRINGS.VOICE_RESULT_ACCEPT_SHORT).props.style).toEqual({
    color: '#00ff00',
  });
});

test('each choice does what it says', () => {
  const { view, handlers } = renderPanel();

  fireEvent.press(view.getByText(STRINGS.VOICE_RESULT_REJECT_SHORT));
  fireEvent.press(view.getByText(STRINGS.VOICE_RESULT_RETRY));
  fireEvent.press(view.getByText(STRINGS.VOICE_RESULT_ACCEPT_SHORT));

  expect(handlers.onReject).toHaveBeenCalledTimes(1);
  expect(handlers.onRetry).toHaveBeenCalledTimes(1);
  expect(handlers.onAccept).toHaveBeenCalledTimes(1);
});

// One decision, one haptic: on a card already marked wrong the verdict will not
// replay, so the press ticks; on an unmarked card the verdict buzzes itself.
test('"Missed it" ticks only when the card is already marked', () => {
  const marked = renderPanel(true);
  fireEvent.press(marked.view.getByText(STRINGS.VOICE_RESULT_REJECT_SHORT));
  expect(haptics.selectionFeedback).toHaveBeenCalledTimes(1);
  marked.view.unmount();

  haptics.selectionFeedback.mockClear();
  const unmarked = renderPanel(false);
  fireEvent.press(unmarked.view.getByText(STRINGS.VOICE_RESULT_REJECT_SHORT));
  expect(haptics.selectionFeedback).not.toHaveBeenCalled();
  expect(unmarked.handlers.onReject).toHaveBeenCalledTimes(1);
});
