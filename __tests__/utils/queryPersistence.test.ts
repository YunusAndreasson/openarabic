import { PERSISTENCE_OPTIONS, queryPersister } from '@/utils/queryPersistence';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('Query Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queryPersister', () => {
    it('should be configured with correct options', () => {
      expect(queryPersister).toBeDefined();
      expect(queryPersister.storage).toBeDefined();
      expect(queryPersister.key).toBe('REACT_QUERY_OFFLINE_CACHE');
      expect(queryPersister.throttleTime).toBe(1000);
    });
  });

  describe('PERSISTENCE_OPTIONS', () => {
    it('should have correct configuration', () => {
      expect(PERSISTENCE_OPTIONS.persister).toBe(queryPersister);
      expect(PERSISTENCE_OPTIONS.maxAge).toBe(1000 * 60 * 60 * 24 * 7); // 7 days
      expect(PERSISTENCE_OPTIONS.dehydrateOptions).toBeDefined();
      expect(PERSISTENCE_OPTIONS.dehydrateOptions.shouldDehydrateQuery).toBeDefined();
    });
  });
});
