/**
 * useKeepScreenAwake Tests
 *
 * The two properties this hook exists for, neither of which `useKeepAwake`
 * from expo-keep-awake gives you:
 *
 * 1. A per-instance tag. `ExpoKeepAwakeManager` holds tags in a SET and clears
 *    FLAG_KEEP_SCREEN_ON once `tags.size == 1 && tags.contains(tag)`, so two
 *    screens sharing a literal tag are one set entry and the first to unmount
 *    unlocks the other's display. The review route and the article reader can
 *    both be mounted at once (article B pushes on top of a still-mounted A via
 *    RelatedArticlesByFilter), so this is a live path, not a hypothetical.
 * 2. A releasable lock — `active` — so the review route can drop it on the
 *    completion screen without unmounting.
 *
 * The mocks are module-scope jest.fn()s whose implementations are reinstalled
 * in beforeEach. `resetMocks: true` strips implementations between tests, and
 * activateKeepAwakeAsync is `.catch()`ed by the hook, so a reset mock returning
 * undefined would throw rather than fail informatively.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockActivate = jest.fn<(tag: string) => Promise<void>>();
const mockDeactivate = jest.fn<(tag: string) => Promise<void>>();

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: (tag: string) => mockActivate(tag),
  deactivateKeepAwake: (tag: string) => mockDeactivate(tag),
}));

import { useKeepScreenAwake } from '@/hooks/common/useKeepScreenAwake';

const tagsFrom = (fn: typeof mockActivate): string[] => fn.mock.calls.map(([tag]) => tag);

describe('useKeepScreenAwake', () => {
  beforeEach(() => {
    mockActivate.mockImplementation(() => Promise.resolve());
    mockDeactivate.mockImplementation(() => Promise.resolve());
  });

  test('holds the display while mounted and releases the same tag on unmount', () => {
    const { unmount } = renderHook(() => useKeepScreenAwake());

    expect(mockActivate).toHaveBeenCalledTimes(1);
    expect(mockDeactivate).not.toHaveBeenCalled();

    unmount();

    expect(mockDeactivate).toHaveBeenCalledTimes(1);
    expect(tagsFrom(mockDeactivate)).toEqual(tagsFrom(mockActivate));
  });

  // The defect this hook was written to fix. A shared literal tag made one
  // reader's exit clear the flag for the other, because the native side keys on
  // set membership rather than a count.
  test('two mounted screens take distinct tags, so neither can release the other', () => {
    const first = renderHook(() => useKeepScreenAwake());
    const second = renderHook(() => useKeepScreenAwake());

    const [firstTag, secondTag] = tagsFrom(mockActivate);
    expect(firstTag).toBeTruthy();
    expect(secondTag).toBeTruthy();
    expect(firstTag).not.toBe(secondTag);

    second.unmount();

    expect(tagsFrom(mockDeactivate)).toEqual([secondTag]);

    first.unmount();

    expect(tagsFrom(mockDeactivate)).toEqual([secondTag, firstTag]);
  });

  test('takes no lock at all while inactive', () => {
    const { unmount } = renderHook(() => useKeepScreenAwake(false));

    expect(mockActivate).not.toHaveBeenCalled();

    unmount();

    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  // The review route flips this when the session ends, so the completion screen
  // does not hold the display on behind a summary nobody is reading.
  test('releases when it goes inactive without unmounting, and re-takes it', () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useKeepScreenAwake(active),
      {
        initialProps: { active: true },
      },
    );

    expect(mockActivate).toHaveBeenCalledTimes(1);
    const tag = tagsFrom(mockActivate)[0];

    rerender({ active: false });

    expect(tagsFrom(mockDeactivate)).toEqual([tag]);

    rerender({ active: true });

    expect(mockActivate).toHaveBeenCalledTimes(2);
    expect(tagsFrom(mockActivate)[1]).toBe(tag);
  });

  // A device that refuses the lock is not a reason to take down the screen the
  // learner is reading, so both calls swallow their rejections.
  test('survives a rejected activate and a rejected release', () => {
    mockActivate.mockImplementation(() => Promise.reject(new Error('no activity')));
    mockDeactivate.mockImplementation(() => Promise.reject(new Error('no activity')));

    const { unmount } = renderHook(() => useKeepScreenAwake());

    expect(() => unmount()).not.toThrow();
  });
});
