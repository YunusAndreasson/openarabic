import { renderHook } from '@testing-library/react-native';
import { useAudioPlayer } from '../useAudioPlayer';

const unloadAsync = jest.fn();
const pause = jest.fn();
const seekTo = jest.fn();

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause,
    seekTo,
    unloadAsync,
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    isLoaded: true,
    playing: false,
    currentTime: 0,
    duration: 0,
  })),
  setAudioModeAsync: jest.fn(),
}));

describe('useAudioPlayer cleanup', () => {
  it('stops and unloads audio on unmount', () => {
    const { unmount } = renderHook(() => useAudioPlayer());

    unmount();

    expect(pause).toHaveBeenCalled();
    expect(seekTo).toHaveBeenCalled();
    expect(unloadAsync).toHaveBeenCalled();
  });
});
