import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// A STATEFUL AsyncStorage: the repo-wide mock resolves every read to null.
// Plain closures over the map, re-armed per test (resetMocks strips jest.fn
// implementations).
const mockStore = new Map<string, string>();
const mockGetItem = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItem = jest.fn<(key: string, value: string) => Promise<void>>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (key: string) => mockGetItem(key),
  setItem: (key: string, value: string) => mockSetItem(key, value),
  removeItem: async (key: string) => {
    mockStore.delete(key);
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

import { handleError } from '@/utils/errorHandling';
import {
  clearFlag,
  createJsonStore,
  decodeFields,
  readFlag,
  setFlag,
} from '@/utils/createJsonStore';

interface Counter {
  count: number;
}

const KEY = 'test/counter';

const counterStore = (cache = false) =>
  createJsonStore<Counter>({
    key: KEY,
    decode: raw => decodeFields(raw, { count: 0 }, { count: 'number' }),
    empty: () => ({ count: 0 }),
    onReadError: () => ({ count: -1 }),
    cache,
  });

beforeEach(() => {
  mockStore.clear();
  mockGetItem.mockImplementation(async key => mockStore.get(key) ?? null);
  mockSetItem.mockImplementation(async (key, value) => {
    mockStore.set(key, value);
  });
});

describe('createJsonStore', () => {
  test('a missing key reads as empty, and a write stores plain JSON', async () => {
    const store = counterStore();

    expect(await store.read()).toEqual({ count: 0 });
    await store.write({ count: 3 });

    expect(mockStore.get(KEY)).toBe('{"count":3}');
    expect(await store.read()).toEqual({ count: 3 });
  });

  test('a blob it does not recognise reads as empty, not as an error', async () => {
    mockStore.set(KEY, '[1,2,3]');

    expect(await counterStore().read()).toEqual({ count: 0 });
    expect(handleError).not.toHaveBeenCalled();
  });

  test('a failed read is the fail-safe value, reported, and never written back', async () => {
    mockStore.set(KEY, '{not json');

    expect(await counterStore().read()).toEqual({ count: -1 });
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('neither read nor write rejects when storage throws', async () => {
    mockGetItem.mockRejectedValue(new Error('disk'));
    mockSetItem.mockRejectedValue(new Error('disk'));
    const store = counterStore();

    await expect(store.read()).resolves.toEqual({ count: -1 });
    await expect(store.write({ count: 1 })).resolves.toBeUndefined();
    expect(handleError).toHaveBeenCalledTimes(2);
  });

  test('`report: false` stays silent', async () => {
    mockStore.set(KEY, '{not json');
    const store = createJsonStore<Counter>({
      key: KEY,
      decode: () => null,
      empty: () => ({ count: 0 }),
      onReadError: () => ({ count: -1 }),
      report: false,
    });

    await store.read();
    expect(handleError).not.toHaveBeenCalled();
  });

  test('`encode` decides what is stored', async () => {
    const store = createJsonStore<Set<string>>({
      key: KEY,
      decode: raw => (Array.isArray(raw) ? new Set(raw.map(String)) : null),
      empty: () => new Set(),
      onReadError: () => new Set(),
      encode: days => [...days].sort(),
    });

    await store.write(new Set(['b', 'a']));
    expect(mockStore.get(KEY)).toBe('["a","b"]');
  });

  test('the key may be read at each call', async () => {
    let user = 'a';
    const store = createJsonStore<Counter>({
      key: () => `${KEY}:${user}`,
      decode: raw => decodeFields(raw, { count: 0 }, { count: 'number' }),
      empty: () => ({ count: 0 }),
      onReadError: () => ({ count: -1 }),
    });

    await store.write({ count: 1 });
    user = 'b';
    await store.write({ count: 2 });

    expect(mockStore.get(`${KEY}:a`)).toBe('{"count":1}');
    expect(mockStore.get(`${KEY}:b`)).toBe('{"count":2}');
  });

  describe('with a cache', () => {
    test('serves reads from memory until reset', async () => {
      const store = counterStore(true);
      await store.write({ count: 5 });
      mockStore.set(KEY, '{"count":9}');

      expect(await store.read()).toEqual({ count: 5 });

      store.reset();
      expect(await store.read()).toEqual({ count: 9 });
    });

    test('a read that lands after a newer write does not put the older value back', async () => {
      let finishRead: ((value: string | null) => void) | undefined;
      mockGetItem.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finishRead = resolve;
          }),
      );
      const store = counterStore(true);

      const slowRead = store.read();
      await store.write({ count: 7 });
      finishRead?.('{"count":1}');
      await slowRead;

      expect(await store.read()).toEqual({ count: 7 });
    });
  });
});

describe('decodeFields', () => {
  const defaults = { version: 1, done: false, label: 'x' };
  const schema = { version: 'number', done: 'boolean', label: 'string' } as const;

  test('takes each stored field that has the declared type, and keeps the default otherwise', () => {
    expect(decodeFields({ version: 2, done: 'yes', label: 3 }, defaults, schema)).toEqual({
      version: 2,
      done: false,
      label: 'x',
    });
  });

  test('drops fields the schema does not name', () => {
    expect(decodeFields({ done: true, stray: 1 }, defaults, schema)).toEqual({
      version: 1,
      done: true,
      label: 'x',
    });
  });

  test('keeps the order a spread would have, so the bytes round-trip', () => {
    const optionalDefaults: { a: number; b?: string; c?: string } = { a: 0 };
    const decoded = decodeFields({ c: 'later', a: 1, b: 'first' }, optionalDefaults, {
      a: 'number',
      b: 'string',
      c: 'string',
    });

    expect(JSON.stringify(decoded)).toBe(
      JSON.stringify({ ...optionalDefaults, ...{ c: 'later', a: 1, b: 'first' } }),
    );
  });

  test('reads anything but a plain object as unrecognised', () => {
    expect(decodeFields(null, defaults, schema)).toBeNull();
    expect(decodeFields([true], defaults, schema)).toBeNull();
    expect(decodeFields('done', defaults, schema)).toBeNull();
  });
});

describe('flags', () => {
  test("store the literal 'true', and read absence as false", async () => {
    expect(await readFlag('flag')).toBe(false);

    await setFlag('flag');
    expect(mockStore.get('flag')).toBe('true');
    expect(await readFlag('flag')).toBe(true);

    await clearFlag('flag');
    expect(await readFlag('flag')).toBe(false);
  });
});
