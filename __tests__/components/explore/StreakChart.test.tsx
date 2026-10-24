/**
 * The study-streak sheet's forty-day chart takes the width its sheet gives it.
 *
 * It used to compute one from the window — less 24pt a side — while the sheet
 * insets its content 12pt a side, so the bars sat 12pt inside every line of
 * text above and below them.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { Canvas } from 'react-native-skia';

import { StreakChart } from '@/components/explore/StreakChart';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

const DAYS = Array.from({ length: 40 }, (_, index) => ({
  date: new Date(Date.UTC(2026, 8, 1 + index)).toISOString().slice(0, 10),
  hasActivity: index % 2 === 0,
}));

describe('StreakChart', () => {
  test('spans the width it is laid out at, and draws nothing before it knows it', () => {
    const view = render(<StreakChart dailyActivity={DAYS} streakPeriods={[]} />);

    expect(jest.mocked(Canvas)).not.toHaveBeenCalled();

    fireEvent(view.root, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 351, height: 60 } },
    });

    const props = jest.mocked(Canvas).mock.calls.at(-1)?.[0];
    expect(props?.style).toMatchObject({ width: 351 });
  });
});
