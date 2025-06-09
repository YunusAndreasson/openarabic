import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useFSRS } from './useFSRS';

function Wrapper({ onComplete }: { onComplete?: () => void }) {
  useFSRS({ userId: 1, onComplete });
  return null;
}

describe('useFSRS timers', () => {
  it('clears pending timeouts on unmount', () => {
    const onComplete = jest.fn();
    const { unmount } = render(<Wrapper onComplete={onComplete} />);
    // Unmount before timers fire
    unmount();
    act(() => {
      jest.runAllTimers();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
