/**
 * Hook Tests - useAudioSelector
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    getStatus: jest.fn(),
    subscribe: jest.fn(),
  },
}));

import {
  currentAudioTrack,
  isAudioLoading,
  isAudioPlaying,
  wholeSecondsPosition,
} from '@/hooks/audio/articleAudioStatus';
import { useAudioSelector } from '@/hooks/audio/useAudioSelector';
import { simpleAudioService, type AudioStatus } from '@/services/audioPlayer';
import {
  createAudioStatusMock,
  createEnhancedAudioTrackMock,
} from '@/__tests__/helpers/serviceMocks';

const mockSimpleAudioService = jest.mocked(simpleAudioService);

describe('useAudioSelector', () => {
  /** What the service holds; every snapshot is read from here. */
  let status: AudioStatus;
  let notify: () => void;
  /** The `{ position }` flag each subscription asked the service for. */
  let subscribeOptions: ({ position?: boolean } | undefined)[];
  const mockUnsubscribe = jest.fn();

  /** Publish a new status the way the service does: replace, then notify. */
  const publish = (patch: Partial<AudioStatus>): void => {
    status = { ...status, ...patch };
    act(() => notify());
  };

  beforeEach(() => {
    jest.clearAllMocks();
    status = createAudioStatusMock();
    notify = () => undefined;
    subscribeOptions = [];
    mockSimpleAudioService.getStatus.mockImplementation(() => status);
    mockSimpleAudioService.subscribe.mockImplementation((listener, options) => {
      notify = () => listener(status);
      subscribeOptions.push(options);
      return mockUnsubscribe;
    });
  });

  test('reads its value from the service', () => {
    status = createAudioStatusMock({ playing: true });

    const { result } = renderHook(() => useAudioSelector(isAudioPlaying));

    expect(result.current).toBe(true);
  });

  test('re-renders with the new value when the service publishes one', () => {
    const track = createEnhancedAudioTrackMock();
    const { result } = renderHook(() => useAudioSelector(isAudioLoading));
    expect(result.current).toBe(false);

    publish({ currentTrack: track, isLoaded: false, isBuffering: true });

    expect(result.current).toBe(true);
  });

  test('does not re-render when the reading it selects is unchanged', () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useAudioSelector(isAudioPlaying);
    });
    const rendersAfterMount = renders;

    // A transport change the selector does not read.
    publish({ isBuffering: true, timeControlStatus: 'waitingToPlayAtSpecifiedRate' });

    expect(renders).toBe(rendersAfterMount);
  });

  test('a selected reference stays the same object while the service keeps it', () => {
    const track = createEnhancedAudioTrackMock();
    status = createAudioStatusMock({ currentTrack: track });
    const { result } = renderHook(() => useAudioSelector(currentAudioTrack));

    publish({ playing: true });

    expect(result.current).toBe(track);
  });

  test('subscribes to transport changes only, unless asked for the clock', () => {
    // The review lane runs its player at a 100 ms status interval so the mic
    // gate sees didJustFinish quickly. Every subscriber used to re-render on
    // each of those ticks; the transport channel is what stops that.
    renderHook(() => useAudioSelector(isAudioPlaying));
    renderHook(() => useAudioSelector(wholeSecondsPosition, { position: true }));

    expect(subscribeOptions).toEqual([undefined, { position: true }]);
  });

  test('a clock in whole seconds ignores sub-second ticks', () => {
    status = createAudioStatusMock({ currentTime: 1.1 });
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useAudioSelector(wholeSecondsPosition, { position: true });
    });
    const rendersAfterMount = renders;

    publish({ currentTime: 1.9 });
    expect(renders).toBe(rendersAfterMount);

    publish({ currentTime: 2.05 });
    expect(result.current).toBe(2);
  });

  test('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAudioSelector(isAudioPlaying));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  test('never renders a status older than the one the service holds', () => {
    // The old hook copied the status out of its listener into a ref, so a
    // render between a publish and its notification read the stale copy.
    const { result, rerender } = renderHook(() => useAudioSelector(isAudioPlaying));

    status = { ...status, playing: true }; // published, not yet notified
    rerender({});

    expect(result.current).toBe(true);
  });
});
