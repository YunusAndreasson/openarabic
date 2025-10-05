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

// Helper to create mock Query objects for testing
const createMockQuery = (queryKey: any[]): any => ({
  queryKey,
  queryHash: JSON.stringify(queryKey),
  state: { data: {}, error: null },
});

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

  describe('shouldDehydrateQuery', () => {
    const shouldDehydrateQuery = PERSISTENCE_OPTIONS.dehydrateOptions.shouldDehydrateQuery;

    describe('static data keys', () => {
      it('should persist categories query', () => {
        const query = createMockQuery(['categories']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });

      it('should persist authors query', () => {
        const query = createMockQuery(['authors']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });

      it('should persist articles query', () => {
        const query = createMockQuery(['articles']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });
    });

    describe('filtered article keys', () => {
      it('should persist filtered-articles query', () => {
        const query = createMockQuery(['filtered-articles', { category: 1 }]);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });
    });

    describe('user data keys', () => {
      it('should persist readingList query', () => {
        const query = createMockQuery(['readingList', 'user-123']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });
    });

    describe('reading progress keys', () => {
      it('should persist reading-progress query', () => {
        const query = createMockQuery(['reading-progress', 'user-123']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });

      it('should persist reading-progress-bulk query', () => {
        const query = createMockQuery(['reading-progress-bulk', 'user-123']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });
    });

    describe('vocabulary keys', () => {
      it('should persist fsrs-words query without excluded patterns', () => {
        const query = createMockQuery(['fsrs-words', 'user-123']);
        expect(shouldDehydrateQuery(query)).toBe(true);
      });

      it('should NOT persist fsrs-words query with "due" pattern', () => {
        const query = createMockQuery(['fsrs-words', 'user-123', 'due']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });

      it('should NOT persist fsrs-words query with "live" pattern', () => {
        const query = createMockQuery(['fsrs-words', 'user-123', 'live']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });
    });

    describe('excluded keys', () => {
      it('should NOT persist isInReadingList query', () => {
        const query = createMockQuery(['isInReadingList', 'user-123', 1]);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });

      it('should NOT persist enhancedAudioTracks query', () => {
        const query = createMockQuery(['enhancedAudioTracks', 1]);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });

      it('should NOT persist struggling-words query', () => {
        const query = createMockQuery(['struggling-words', 'user-123']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });
    });

    describe('excluded patterns', () => {
      it('should NOT persist queries with "due" pattern in any position', () => {
        const query = createMockQuery(['some-key', 'due', 'user-123']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });

      it('should NOT persist queries with "live" pattern in any position', () => {
        const query = createMockQuery(['some-key', 'user-123', 'live']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });
    });

    describe('default behavior', () => {
      it('should NOT persist unknown query keys by default', () => {
        const query = createMockQuery(['unknown-key']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });

      it('should NOT persist arbitrary nested keys', () => {
        const query = createMockQuery(['some', 'random', 'query']);
        expect(shouldDehydrateQuery(query)).toBe(false);
      });
    });
  });
});
