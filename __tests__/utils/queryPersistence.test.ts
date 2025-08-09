import { PERSISTENCE_OPTIONS, queryPersister } from '@/utils/queryPersistence';

// Capture options passed into the persister factory
const captured: { lastOptions?: any } = {};

// Mock the persister factory to capture configuration
jest.mock('@tanstack/query-async-storage-persister', () => ({
  __esModule: true,
  createAsyncStoragePersister: (opts: any) => {
    captured.lastOptions = opts;
    return {
      persistClient: jest.fn(),
      restoreClient: jest.fn(),
      removeClient: jest.fn(),
    };
  },
}));

// Ensure we control the storage reference returned by our helper
jest.mock('@/utils/safeAsyncStorage', () => ({
  getSafeStorage: () => 'MOCK_STORAGE',
}));

describe('Query Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queryPersister', () => {
    it('should expose public API and be configured with correct options', () => {
      // Public API shape
      expect(typeof (queryPersister as any).persistClient).toBe('function');
      expect(typeof (queryPersister as any).restoreClient).toBe('function');
      expect(typeof (queryPersister as any).removeClient).toBe('function');

      // Captured config from factory
      expect(captured.lastOptions).toBeDefined();
      expect(captured.lastOptions.key).toBe('REACT_QUERY_OFFLINE_CACHE');
      expect(captured.lastOptions.throttleTime).toBe(1000);
      expect(captured.lastOptions.storage).toBe('MOCK_STORAGE');
      expect(typeof captured.lastOptions.serialize).toBe('function');
      expect(typeof captured.lastOptions.deserialize).toBe('function');
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
