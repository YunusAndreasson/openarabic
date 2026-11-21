import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAppRating } from './app-rating';

describe('parseAppRating', () => {
  it('reads the rating', () => {
    expect(
      parseAppRating({ results: [{ averageUserRating: 4.5, userRatingCount: 2 }] }),
    ).toBe(4.5);
  });

  it.each([
    [null],
    [{}],
    [{ results: [] }],
    [{ results: [{ averageUserRating: 5, userRatingCount: 0 }] }],
    [{ results: [{ userRatingCount: 3 }] }],
    [{ results: [{ averageUserRating: '5', userRatingCount: 3 }] }],
    [{ results: [{ averageUserRating: 0, userRatingCount: 3 }] }],
    [{ results: [{ averageUserRating: 6, userRatingCount: 3 }] }],
  ])('returns null for %j', (lookup) => {
    expect(parseAppRating(lookup)).toBeNull();
  });
});

describe('getAppRating', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when the lookup fails, and does not retry at once', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('down'));
    vi.stubGlobal('fetch', fetchMock);
    const { getAppRating } = await import('./app-rating');
    expect(await getAppRating()).toBeNull();
    expect(await getAppRating()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const { getAppRating } = await import('./app-rating');
    expect(await getAppRating()).toBeNull();
  });

  it('caches a good value', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ averageUserRating: 5, userRatingCount: 3 }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getAppRating } = await import('./app-rating');
    expect(await getAppRating()).toBe(5);
    expect(await getAppRating()).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
