/**
 * Test Helpers - Barrel Export
 *
 * Central export for all test utilities, mock factories, and helpers.
 *
 * Usage:
 * ```typescript
 * import {
 *   // Render utilities
 *   renderWithQuery,
 *   renderWithProviders,
 *   createTestQueryClient,
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
export {
  createTestQueryClient,
  renderWithQuery,
  renderWithProviders,
  renderWithAppProviders,
  renderWithAsyncSetup,
  waitForQueryToSettle,
  waitForQuery,
  createMockSessionMetrics,
  flushPromisesAndTimers,
  advanceTimersByTime,
} from './testUtils';

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
  createWordSizingMock,
  // Session
  createSessionMetricsMock,
  // Utilities
  createTimerCleanupMock,
  createOpacityAnimationMock,
  // Services
  createAudioCacheMock,
  createStorageUtilsMock,
  createCheckAuthenticationMock,
  // Setup helpers
  hookMockConfigs,
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
  createMockSentenceWithWords,
  // Articles
  createMockArticle,
  createMockArticleMinimal,
  createMockArticleList,
  createMockArticleWithDifficulty,
  createMockArticleWithSentences,
  // User data
  createMockUserId,
  createMockReadingProgress,
  createMockBookmark,
  createMockTranslationImprovement,
  // Scenarios
  articleScenarios,
  wordScenarios,
  // Supabase mocks
  createSupabaseQueryMock,
  createSupabaseFromMock,
  createSupabaseClientMock,
  type SupabaseQueryResponse,
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
  // Query client
  createMockQueryClient,
  // Test patterns
  testPatterns,
  performanceBenchmarks,
  testUtils as fsrsTestUtils,
} from './fsrsTestHelpers';

// ============================================================================
// TYPE-SAFE MOCKING (mockHelpers.ts)
// ============================================================================
export {
  mockFunction,
  mockService,
  mockWithDefault,
  mockAsyncWithDefault,
  mockClass,
  mockMethods,
  expectCalledWith,
  expectResolvedWith,
  createSpy,
  mockImplementation,
  resetServiceMocks,
  clearServiceMocks,
  isMockedFunction,
  mockWithSequence,
  mockAsyncWithSequence,
} from './mockHelpers';

// ============================================================================
// EXPO MODULE MOCKS (mockExpoModules.ts)
// ============================================================================
export {
  createExpoNotificationsMock,
  createExpoBackgroundTaskMock,
  createExpoTaskManagerMock,
  createExpoAudioMock,
  createExpoHapticsMock,
  createReactNativeAppStateMock,
} from './mockExpoModules';

// ============================================================================
// REDUX TEST STORE (testStore.tsx)
// ============================================================================
export {
  setupTestStore,
  TestStoreProvider,
  TestProviders,
  defaultPreloadedState,
  type TestRootState,
} from './testStore';

// ============================================================================
// CUSTOM MATCHERS (customMatchers.ts)
// ============================================================================
export { customMatchers } from './customMatchers';

// ============================================================================
// CHART MOCKS (chartMocks.ts)
// ============================================================================
export {
  // Path builder mocks
  mockBuildSmoothChartPath,
  // Constants mocks
  mockCalculateDataPointPositions,
  mockChartConstants,
  // Colors mocks
  mockChartColors,
  // Utils mocks
  mockPerformanceZones,
  // Reset utility
  resetChartMocks,
} from './chartMocks';

// ============================================================================
// COMPONENT MOCKS (componentMocks.tsx)
// ============================================================================
export {
  // Theme/Colors mocks
  mockColors,
  useColorsMockFactory,
  useThemeDetectionMockFactory,
  // Reanimated mock
  createReanimatedMock,
  // Safe area mock
  createSafeAreaContextMock,
  // Animation hooks mock
  createAnimationHooksMock,
  // Reset utility
  resetComponentMocks,
} from './componentMocks';
