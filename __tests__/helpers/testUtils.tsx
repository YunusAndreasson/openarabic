import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { act } from 'react';
import { Provider } from 'react-redux';

import { store } from '@/store/store';
import type { SessionMetrics } from '@/types/review.types';

/**
 * Standard QueryClient configuration for tests
 * - No retries (fail fast)
 * - No garbage collection time (immediate cleanup)
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Render component with QueryClient wrapper
 * Useful for testing hooks and components that use React Query
 */
export const renderWithQuery = (ui: ReactElement, queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return {
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>),
    queryClient: client,
  };
};

/**
 * Render component with full app providers (QueryClient + Redux)
 * Useful for integration tests that need both providers
 */
export const renderWithProviders = (ui: ReactElement, queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return {
    ...render(
      <Provider store={store}>
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
      </Provider>,
    ),
    queryClient: client,
  };
};

/**
 * Custom render function that wraps the standard render with providers
 * Can be used as a drop-in replacement for render() from @testing-library/react-native
 */
export const renderWithAppProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    queryClient,
  };
};

/**
 * Render component with async setup function
 * Useful for components that require async initialization before rendering
 *
 * @example
 * const { result, cleanup } = await renderWithAsyncSetup(
 *   <MyComponent />,
 *   async () => { await initializeAudio(); }
 * );
 */
export const renderWithAsyncSetup = async <T extends ReactElement>(
  ui: T,
  setupFn?: () => Promise<void>,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const queryClient = createTestQueryClient();

  // Run async setup if provided
  if (setupFn) {
    await act(async () => {
      await setupFn();
    });
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...options });

  return {
    ...renderResult,
    queryClient,
    cleanup: async () => {
      renderResult.unmount();
      queryClient.clear();
    },
  };
};

/**
 * Wait for React Query to settle (all queries resolved or rejected)
 * Useful for waiting for data fetching to complete in tests
 *
 * @example
 * await waitForQueryToSettle(queryClient);
 * expect(screen.getByText('Data loaded')).toBeTruthy();
 */
export const waitForQueryToSettle = async (
  queryClient: QueryClient,
  timeout = 5000,
): Promise<void> => {
  await waitFor(
    () => {
      const isFetching = queryClient.isFetching();
      const isMutating = queryClient.isMutating();

      if (isFetching > 0 || isMutating > 0) {
        throw new Error('Queries still pending');
      }
    },
    { timeout },
  );
};

/**
 * Wait for specific query to complete
 * More targeted than waitForQueryToSettle
 *
 * @example
 * await waitForQuery(queryClient, ['fsrs-words', userId]);
 */
export const waitForQuery = async (
  queryClient: QueryClient,
  queryKey: unknown[],
  timeout = 5000,
): Promise<void> => {
  await waitFor(
    () => {
      const state = queryClient.getQueryState(queryKey);
      if (!state || state.fetchStatus !== 'idle') {
        throw new Error(`Query ${JSON.stringify(queryKey)} not settled`);
      }
    },
    { timeout },
  );
};

/**
 * Factory function to create mock session metrics with sensible defaults
 * Useful for testing session completion screens and progress tracking
 *
 * @example
 * const metrics = createMockSessionMetrics({ wordsReviewed: 10, wordsKnown: 7 });
 */
export const createMockSessionMetrics = (
  overrides: Partial<SessionMetrics> = {},
): SessionMetrics => {
  return {
    wordsReviewed: 5,
    wordsKnown: 3,
    wordsVague: 1,
    wordsUnknown: 1,
    averageStabilityIncrease: 2.5,
    longestStreak: 3,
    currentStreak: 2,
    masteredWords: 1,
    startTime: Date.now() - 15000, // 15 seconds ago
    ...overrides,
  };
};

/**
 * Helper to flush all pending timers and promises
 * Useful for testing components with setTimeout, setInterval, or debouncing
 *
 * @example
 * await flushPromisesAndTimers();
 * expect(mockCallback).toHaveBeenCalled();
 */
export const flushPromisesAndTimers = async (): Promise<void> => {
  await act(async () => {
    // Flush all pending promises
    await new Promise(resolve => setImmediate(resolve));
    // Flush all timers
    jest.runAllTimers();
  });
};

/**
 * Advance timers by a specific amount and flush promises
 * Useful for testing time-based behavior (debouncing, throttling, animations)
 *
 * @example
 * await advanceTimersByTime(3000); // Advance 3 seconds
 */
export const advanceTimersByTime = async (ms: number): Promise<void> => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await new Promise(resolve => setImmediate(resolve));
  });
};
