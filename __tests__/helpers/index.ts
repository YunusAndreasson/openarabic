/**
 * Test Helpers - Barrel Export
 *
 * Central export for all test utilities and helpers.
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
