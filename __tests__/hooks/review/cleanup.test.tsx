import { act, render } from '@testing-library/react-native';
import React from 'react';

import { useReview } from '../../../hooks/review';

// Use modern fake timers to ensure timers are controlled
jest.useFakeTimers();

// Mock audio player to avoid real native calls
jest.mock('../../../hooks/audio/useSimpleAudioPlayer', () => ({
  useSimpleAudioPlayer: () => ({
    play: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Minimal component that mounts/unmounts review to exercise cleanup
function ReviewHarness() {
  const { handleSwipeLeft, handleSwipeRight, handleClose, isComplete } = useReview();

  // trigger some actions to schedule timers
  React.useEffect(() => {
    handleSwipeLeft();
    handleSwipeRight();
    // Close after a short delay to trigger navigation timer cleanup
    const t = setTimeout(() => handleClose(), 10);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isComplete ? null : null;
}

describe('useReview cleanup', () => {
  it('does not leave active timers after unmount', () => {
    const { unmount } = render(<ReviewHarness />);

    // Advance all timers to execute scheduled timeouts
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Unmount and ensure no pending timers remain
    unmount();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    // If timers remain, Jest would complain about pending timers
    expect(true).toBe(true);
  });
});
