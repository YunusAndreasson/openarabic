/**
 * The shared bottom-sheet backdrop must not exist while its sheet is closed.
 *
 * Every inline `<BottomSheet>` in the app mounts at `index={-1}` and keeps its
 * backdrop mounted alongside it. The backdrop is a full-screen, absolutely
 * positioned view wrapped in a `GestureDetector`, drawn above the host screen —
 * so as long as it is in the tree it is a lid over that screen. It shipped that
 * way once and the article reader could not be scrolled or have a word tapped
 * until the word sheet had been opened a first time.
 *
 * `pointerEvents="none"` is not a sufficient guard, which is why this asserts on
 * the tree rather than on a prop: it removes the view from React Native's own
 * hit-testing (taps fall through) but not from Gesture Handler's, which
 * hit-tests the native view tree itself and went on eating drags.
 */

import { render } from '@testing-library/react-native';
import { scheduleOnRN } from 'react-native-worklets';

import { BottomSheetBackdrop } from '@/utils/bottomSheetUtils';

const mockClose = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => ({
  useBottomSheet: () => ({ close: mockClose }),
}));

jest.mock('@/hooks/ui/useBlurProps', () => ({
  useBlurProps: () => ({ intensity: 20, tint: 'dark' }),
}));

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View };
});

/** A stand-in for the shared value gorhom hands the backdrop. */
const animatedIndexAt = (value: number) => ({ value, get: () => value }) as never;

describe('BottomSheetBackdrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders nothing while the sheet is closed', () => {
    const { toJSON } = render(
      <BottomSheetBackdrop
        animatedIndex={animatedIndexAt(-1)}
        animatedPosition={animatedIndexAt(0)}
        style={undefined}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  test('renders nothing while the sheet is closed past its resting index', () => {
    const { toJSON } = render(
      <BottomSheetBackdrop
        animatedIndex={animatedIndexAt(-2)}
        animatedPosition={animatedIndexAt(0)}
        style={undefined}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  /** The open state travels through `scheduleOnRN` from inside the reaction. */
  test('draws the dimming layer once the sheet is open', () => {
    const { toJSON } = render(
      <BottomSheetBackdrop
        animatedIndex={animatedIndexAt(0)}
        animatedPosition={animatedIndexAt(0)}
        style={undefined}
      />,
    );

    expect(scheduleOnRN).toHaveBeenCalledWith(expect.any(Function), false);
    expect(toJSON()).not.toBeNull();
  });

  test('never asks for it while the sheet is closed', () => {
    render(
      <BottomSheetBackdrop
        animatedIndex={animatedIndexAt(-1)}
        animatedPosition={animatedIndexAt(0)}
        style={undefined}
      />,
    );

    expect(scheduleOnRN).not.toHaveBeenCalledWith(expect.any(Function), false);
  });
});
