import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';

import { store } from '@/store/store';

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
      </Provider>
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
  options?: Omit<RenderOptions, 'wrapper'>
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
