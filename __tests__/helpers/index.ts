/**
 * Test Helpers - Barrel Export
 *
 * Central export for all test utilities and helpers.
 */

// ============================================================================
// RENDER UTILITIES (testUtils.tsx)
// ============================================================================
export {
  createTestQueryClient,
  flushPromisesAndTimers,
  advanceTimersByTime,
  measuring,
  type MeasureCallback,
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

// ============================================================================
// CUSTOM RENDER WRAPPER (customRender.tsx)
// ============================================================================
export {
  renderWithProviders,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  type TestRootState,
} from './customRender';

// ============================================================================
// SERVICE MOCKS (serviceMocks.ts)
// ============================================================================
export {
  // Article factories
  createArticleMock,
  createArticlesMock,
  createSentenceMock,
  createAuthorMock,
  createCategoryMock,
  // Vocabulary factories
  createRootMock,
  createSentenceWordMock,
  createWordTypeMock,
  createStudyWordMock,
  // Reading progress factories
  createReadingProgressMock,
  createReadingListMock,
  createReadingListArrayMock,
  // Audio track factories
  createEnhancedAudioTrackMock,
  createEnhancedAudioTracksMock,
  // User/Auth factories
  createUserMock,
  createSessionMock,
  // API response factories
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createNetworkErrorResponse,
} from './serviceMocks';

// ============================================================================
// ANALYTICS MOCKS (analyticsMocks.ts)
// ============================================================================
export {
  // Mock factory
  createAnalyticsMock,
  createAnalyticsModuleMock,
  // Assertion helpers
  expectAnalyticsEvent,
  expectNoAnalyticsEvent,
  expectAnalyticsEventCount,
  getTrackedEvents,
  clearTrackedEvents,
  // Custom Jest matchers
  analyticsMatchers,
} from './analyticsMocks';
