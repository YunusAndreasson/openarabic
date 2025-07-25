import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PERSISTENCE_OPTIONS,
  clearPersistedCache,
  getPersistedCacheSize,
} from '../../utils/queryPersistence';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

const { shouldDehydrateQuery } = PERSISTENCE_OPTIONS.dehydrateOptions;

describe('queryPersistence utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists allowed query keys', () => {
    const allowedKeys = [
      'categories',
      'authors',
      'articles',
      'filtered-articles',
      'readingList',
      'fsrs-words',
      'vocabulary-stats',
      'reading-progress',
      'reading-progress-bulk',
    ];
    for (const key of allowedKeys) {
      const query = { queryKey: [key] } as any;
      expect(shouldDehydrateQuery(query)).toBe(true);
    }
  });

  it('skips excluded query keys and patterns', () => {
    const excluded = ['isInReadingList', 'audio-tracks', 'struggling-words'];
    for (const key of excluded) {
      const query = { queryKey: [key] } as any;
      expect(shouldDehydrateQuery(query)).toBe(false);
    }

    const withPattern = [
      { key: 'fsrs-words', extra: 'due' },
      { key: 'fsrs-words', extra: 'live' },
      { key: 'anything', extra: 'due' },
    ];
    for (const { key, extra } of withPattern) {
      const query = { queryKey: [key, extra] } as any;
      expect(shouldDehydrateQuery(query)).toBe(false);
    }
  });

  it('clears persisted cache', async () => {
    await clearPersistedCache();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('REACT_QUERY_OFFLINE_CACHE');
  });

  it('gets persisted cache size', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('cache-data');
    const size = await getPersistedCacheSize();
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('REACT_QUERY_OFFLINE_CACHE');
    expect(size).toBe(new TextEncoder().encode('cache-data').length);
  });

  it('returns 0 when no cache is found', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const size = await getPersistedCacheSize();
    expect(size).toBe(0);
  });
});
