import { expect, jest, test } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import { GuidedVoiceChoice } from '@/components/review/GuidedVoiceChoice';
import { STRINGS } from '@/constants/strings';
import { setVoiceEnabled } from '@/store/settingsSlice';
import { readStudyDays } from '@/utils/studyDayLedger';

const mockDispatch = jest.fn();
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelectorShallow: (select: (state: unknown) => unknown) =>
    select({ settings: { voiceEnabled: false }, firstPage: { guided: true } }),
}));
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);
jest.mock('@/utils/studyDayLedger', () => ({ readStudyDays: jest.fn() }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));

test('speaking becomes a deliberate recall action on the next local study day', async () => {
  jest.setSystemTime(new Date(2026, 10, 24, 23, 55));
  jest.mocked(readStudyDays).mockResolvedValue(new Set(['2026-11-24']));
  const first = render(<GuidedVoiceChoice />);
  await act(async () => {});
  expect(first.queryByText(STRINGS.VOICE_SPEAK_TO_ANSWER)).toBeNull();
  first.unmount();
  jest.setSystemTime(new Date(2026, 10, 25, 0, 5));
  const next = render(<GuidedVoiceChoice />);
  const button = await next.findByLabelText(STRINGS.VOICE_SPEAK_TO_ANSWER);
  expect(next.getByText(STRINGS.VOICE_OPT_IN_DETAIL)).toBeTruthy();
  expect(mockDispatch).not.toHaveBeenCalled();
  fireEvent.press(button);
  expect(mockDispatch).toHaveBeenCalledWith(setVoiceEnabled(true));
});
