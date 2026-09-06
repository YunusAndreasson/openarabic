import { act, fireEvent, render } from '@testing-library/react-native';
import { ReviewGradeBar } from '@/components/review/ReviewGradeBar';
import { TIMING_CONFIG } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    error: '#ff0000',
    warning: '#ffff00',
    success: '#00ff00',
    text: '#ffffff',
    card: '#111111',
  }),
}));
jest.mock('@/components/primitives/ThemedText', () => ({
  ThemedText: require('react-native').Text,
}));

test('ignores reveal double-taps until the answer flip finishes, then allows grading', () => {
  jest.useFakeTimers();
  const onGrade = jest.fn();
  const view = render(<ReviewGradeBar onGrade={onGrade} />);
  fireEvent.press(view.getByText(STRINGS.GRADE_FORGOT));
  expect(onGrade).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(TIMING_CONFIG.FLIP.duration));
  fireEvent.press(view.getByText(STRINGS.GRADE_FORGOT));
  expect(onGrade).toHaveBeenCalledWith('unknown');
  view.unmount();
  jest.useRealTimers();
});
