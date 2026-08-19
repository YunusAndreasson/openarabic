import { act, renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { usePlaylistUI } from '@/hooks/playlist/usePlaylistUI';

const mockDispatch = jest.fn();
const mockPrefetchArticle = jest.fn();

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/hooks/app/useAppPreloader', () => ({
  useAppPreloader: () => ({ prefetchArticle: mockPrefetchArticle }),
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

describe('usePlaylistUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reveals the empty state on the next animation frame', () => {
    const { result } = renderHook(() => usePlaylistUI({ sortedReadingList: [], editMode: false }));

    expect(result.current.canShowEmpty).toBe(false);

    act(() => {
      jest.advanceTimersToNextFrame();
    });

    expect(result.current.canShowEmpty).toBe(true);
  });

  test('cancels the pending animation frame on unmount', () => {
    const cancelFrameSpy = jest.spyOn(global, 'cancelAnimationFrame');
    const { unmount } = renderHook(() => usePlaylistUI({ sortedReadingList: [], editMode: false }));

    unmount();

    expect(cancelFrameSpy).toHaveBeenCalledWith(expect.anything());
  });
});
