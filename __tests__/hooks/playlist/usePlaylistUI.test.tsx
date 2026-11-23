import { act, renderHook, render, fireEvent } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { AccessibilityInfo } from 'react-native';
import { DragHandle } from '@/components/playlist/DragHandle';
import { setCustomOrder } from '@/store/playlistSlice';
import type { BookmarkItem } from '@/types/bookmark.types';
import { usePlaylistUI } from '@/hooks/playlist/usePlaylistUI';

const mockDispatch = jest.fn();
const mockPrefetchArticle = jest.fn();

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/hooks/articles/useArticlePrefetch', () => ({
  useArticlePrefetch: () => mockPrefetchArticle,
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

describe('usePlaylistUI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('moving a track uses the saved playlist order and announces its new position', () => {
    const tracks: BookmarkItem[] = [1, 2, 3].map(id => ({
      article_id: id,
      user_id: 'learner',
      added_at: '',
      articles: {
        id,
        title: String(id),
        author_id: 1,
        category_id: 1,
        content_hash: '',
        created_at: '',
        audio_url: '',
        audio_url_bilingual: null,
        image_url: '',
        summary: '',
        difficulty_level: 1,
        author: { id: 1, name: '' },
        category: { id: 1, name: '' },
        article_sentences: [],
      },
    }));
    const { result } = renderHook(() =>
      usePlaylistUI({ sortedReadingList: tracks, editMode: true }),
    );
    // DraggableFlatList returns a new array even when the handle was released
    // in its starting position. The playlist should still use its default order.
    const stationaryDrop = { from: 1, to: 1, data: tracks.slice() };
    result.current.handleDragEnd(stationaryDrop);
    expect(mockDispatch).not.toHaveBeenCalled();

    result.current.moveTrack(1, -1);
    result.current.moveTrack(3, 1);
    result.current.moveTrack(100, 1);
    expect(mockDispatch).not.toHaveBeenCalled();
    result.current.moveTrack(2, -1);
    expect(mockDispatch).toHaveBeenCalledWith(setCustomOrder([2, 1, 3]));
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('2, position 1 of 3');
    expect(tracks.map(track => track.article_id)).toEqual([1, 2, 3]);
  });

  test('the first track offers only a move later action and keeps long-press dragging', () => {
    const moveLater = jest.fn();
    const drag = jest.fn();
    const { getByLabelText } = render(
      <DragHandle
        accessibilityLabel="Reorder article"
        delayLongPress={200}
        onLongPress={drag}
        moveLater={moveLater}
      />,
    );
    const handle = getByLabelText('Reorder article');
    expect(handle).toHaveProp('accessibilityActions', [{ name: 'later', label: 'Move later' }]);
    fireEvent(handle, 'accessibilityAction', { nativeEvent: { actionName: 'later' } });
    expect(moveLater).toHaveBeenCalledTimes(1);
    fireEvent(handle, 'longPress');
    expect(drag).toHaveBeenCalledTimes(1);
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
