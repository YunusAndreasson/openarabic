/**
 * Test Helpers - Barrel Export
 *
 * Central export for all test utilities, mock factories, and helpers.
 *
 * Usage:
 * ```typescript
 * import {
 *   // Query client + timing
 *   createTestQueryClient,
 *   flushPromisesAndTimers,
 *   advanceTimersByTime,
 *
 *   // Hook mocks
 *   createAuthMock,
 *   createFSRSMock,
 *   createAudioPlayerMock,
 *
 *   // Data factories
 *   createMockArticle,
 *   createMockSentenceWord,
 *
 *   // FSRS test helpers
 *   createTestWord,
 *   fsrsArbitraries,
 *
 *   // Type-safe mocking
 *   mockFunction,
 *   mockService,
 * } from '@/__tests__/helpers';
 * ```
 */

// ============================================================================
// RENDER UTILITIES (testUtils.tsx)
// ============================================================================
export { createTestQueryClient, flushPromisesAndTimers, advanceTimersByTime } from './testUtils';

// ============================================================================
// HOOK MOCKS (hookMocks.ts)
// ============================================================================
export {
  // Auth
  createAuthMock,
  // Audio
  createAudioPlayerMock,
  createAudioPreloaderMock,
  // Vocabulary/FSRS
  createFSRSMock,
  // Session
  createSessionMetricsMock,
  // Utilities
  createTimerCleanupMock,
  createOpacityAnimationMock,
  // Setup helpers
  setupInteractionManagerMock,
  // Test wrappers
  createHookTestWrapper,
} from './hookMocks';

// ============================================================================
// DATA FACTORIES (mockFactories.ts)
// ============================================================================
export {
  // Root data
  createMockRoot,
  createMockCategory,
  createMockAuthor,
  createMockWordType,
  // Words
  createMockSentenceWord,
  createMockSentenceWordRow,
  createMockSentenceWordList,
  // Sentences
  createMockArticleSentence,
  // Articles
  createMockArticle,
} from './mockFactories';

// ============================================================================
// FSRS TEST HELPERS (fsrsTestHelpers.ts)
// ============================================================================
export {
  // Base factory
  createTestWord,
  // Property-based testing
  fsrsArbitraries,
  studyWordArbitrary,
  wordSetArbitrary,
  strugglingWordArbitrary,
  dueWordArbitrary,
  propertyTestUtils,
  advancedTestScenarios,
  // Word set factories
  createWordSet,
  createWordsWithStates,
  createLargeWordSet,
  createEdgeCaseWords,
  // Test patterns
  testPatterns,
} from './fsrsTestHelpers';

// ============================================================================
// TYPE-SAFE MOCKING (mockHelpers.ts)
// ============================================================================
export { mockFunction, mockService, mockWithDefault, mockAsyncWithDefault } from './mockHelpers';

// ============================================================================
// REDUX TEST STORE (testStore.tsx)
// ============================================================================
export {
  setupTestStore,
  TestStoreProvider,
  defaultPreloadedState,
  type TestRootState,
} from './testStore';

// ============================================================================
// CHART MOCKS (chartMocks.ts)
// ============================================================================
export { mockChartColors, mockPerformanceZones } from './chartMocks';

// ============================================================================
// COMPONENT MOCKS (componentMocks.tsx)
// ============================================================================
export {
  // Theme/Colors mocks
  useColorsMockFactory,
  useThemeDetectionMockFactory,
  // Reanimated mock
  createReanimatedMock,
  // Safe area mock
  createSafeAreaContextMock,
  // Animation hooks mock
  createAnimationHooksMock,
} from './componentMocks';
