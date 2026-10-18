/**
 * useReaderKeepAwake — the reader holds the display while it is being read.
 *
 * It used to hold it for as long as the reader was open, so a phone set down
 * mid-article stayed lit until it was picked up again. Now: while this article
 * plays, or within a reading window after the last touch.
 *
 * `useKeepScreenAwake` is mocked to record the `active` value it is handed;
 * its own tag and native-module behaviour have their own suite.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { TIMING_CONSTANTS } from '@/constants/animation';

const mockUseKeepScreenAwake = jest.fn<(active?: boolean) => void>();

jest.mock('@/hooks/common/useKeepScreenAwake', () => ({
  useKeepScreenAwake: (active?: boolean) => mockUseKeepScreenAwake(active),
}));

import { useReaderKeepAwake } from '@/hooks/articles/useReaderKeepAwake';

const WINDOW = TIMING_CONSTANTS.READER_KEEP_AWAKE_WINDOW;

/** The `active` value from the most recent render. */
const lastActive = () => {
  const { calls } = mockUseKeepScreenAwake.mock;
  return calls[calls.length - 1]?.[0];
};

describe('useReaderKeepAwake', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('holds the display from mount, and lets it go once the window passes untouched', () => {
    renderHook(() => useReaderKeepAwake(false));

    expect(lastActive()).toBe(true);

    act(() => {
      jest.advanceTimersByTime(WINDOW - 1);
    });
    expect(lastActive()).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(lastActive()).toBe(false);
  });

  test('a touch reopens the window', () => {
    const { result } = renderHook(() => useReaderKeepAwake(false));

    act(() => {
      jest.advanceTimersByTime(WINDOW - 1);
    });
    act(() => {
      result.current();
    });
    act(() => {
      jest.advanceTimersByTime(WINDOW - 1);
    });
    expect(lastActive()).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(lastActive()).toBe(false);
  });

  test('a touch after the window closed takes the display back', () => {
    const { result } = renderHook(() => useReaderKeepAwake(false));

    act(() => {
      jest.advanceTimersByTime(WINDOW);
    });
    expect(lastActive()).toBe(false);

    act(() => {
      result.current();
    });
    expect(lastActive()).toBe(true);
  });

  // Reading along with the audio may not touch the screen for the whole clip
  test('holds the display while this article plays, whatever the window says', () => {
    const { rerender } = renderHook(
      ({ isPlaying }: { isPlaying: boolean }) => useReaderKeepAwake(isPlaying),
      { initialProps: { isPlaying: true } },
    );

    act(() => {
      jest.advanceTimersByTime(WINDOW * 2);
    });
    expect(lastActive()).toBe(true);

    rerender({ isPlaying: false });
    expect(lastActive()).toBe(false);
  });
});
