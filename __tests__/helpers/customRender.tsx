/**
 * Custom Render Wrapper for Component Tests
 *
 * Provides a pre-configured render function that wraps components with all
 * necessary providers (QueryClient, Redux, SafeArea) to eliminate test boilerplate.
 *
 * Usage:
 * ```typescript
 * import { renderWithProviders, screen, fireEvent } from '@/__tests__/helpers/customRender';
 *
 * test('renders component', () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeTruthy();
 * });
 *
 * // With custom Redux state:
 * test('renders with state', () => {
 *   renderWithProviders(<MyComponent />, {
 *     preloadedState: { theme: { mode: 'dark' } },
 *   });
 * });
 * ```
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - Type-safe provider configuration
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  type RenderOptions,
} from '@testing-library/react-native';
import React, { type ReactElement, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setupTestStore, type TestRootState } from './testStore';
import { createTestQueryClient } from './testUtils';

// ============================================================================
// TYPES
// ============================================================================

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Partial Redux state to preload */
  preloadedState?: Partial<TestRootState>;
  /** Custom QueryClient (defaults to test-configured client) */
  queryClient?: QueryClient;
  /** Include SafeAreaProvider wrapper (defaults to true) */
  withSafeArea?: boolean;
  /** Include Redux provider (defaults to true) */
  withRedux?: boolean;
  /** Include QueryClient provider (defaults to true) */
  withQueryClient?: boolean;
}

interface RenderWithProvidersResult extends ReturnType<typeof render> {
  /** The Redux store instance for assertions */
  store: ReturnType<typeof setupTestStore>;
  /** The QueryClient instance for cache manipulation */
  queryClient: QueryClient;
}

// ============================================================================
// SAFE AREA MOCK VALUES
// ============================================================================

const mockSafeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

// ============================================================================
// PROVIDER WRAPPER FACTORY
// ============================================================================

function createWrapper(options: {
  store: ReturnType<typeof setupTestStore>;
  queryClient: QueryClient;
  withSafeArea: boolean;
  withRedux: boolean;
  withQueryClient: boolean;
}) {
  const { store, queryClient, withSafeArea, withRedux, withQueryClient } = options;

  return function Wrapper({ children }: { children: ReactNode }) {
    let content = <>{children}</>;

    // Wrap with QueryClient if enabled
    if (withQueryClient) {
      content = <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
    }

    // Wrap with Redux if enabled
    if (withRedux) {
      content = <Provider store={store}>{content}</Provider>;
    }

    // Wrap with SafeArea if enabled (outermost wrapper)
    if (withSafeArea) {
      content = <SafeAreaProvider initialMetrics={mockSafeAreaMetrics}>{content}</SafeAreaProvider>;
    }

    return content;
  };
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Renders a component wrapped with test providers (QueryClient, Redux, SafeArea)
 *
 * @param ui - The React element to render
 * @param options - Configuration options for providers and initial state
 * @returns Render result plus store and queryClient references
 *
 * @example
 * // Basic usage
 * const { getByText } = renderWithProviders(<MyComponent />);
 *
 * @example
 * // With preloaded Redux state
 * renderWithProviders(<MyComponent />, {
 *   preloadedState: { settings: { audioLanguagePreference: 'BILINGUAL' } },
 * });
 *
 * @example
 * // Without SafeArea (for isolated unit tests)
 * renderWithProviders(<MyComponent />, { withSafeArea: false });
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    queryClient = createTestQueryClient(),
    withSafeArea = true,
    withRedux = true,
    withQueryClient = true,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const store = setupTestStore(preloadedState);

  const Wrapper = createWrapper({
    store,
    queryClient,
    withSafeArea,
    withRedux,
    withQueryClient,
  });

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    store,
    queryClient,
  };
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// Re-export testing library utilities so tests can import everything from one place
export { screen, fireEvent, waitFor, within, act };

// Re-export store types and utilities
export { type TestRootState } from './testStore';
