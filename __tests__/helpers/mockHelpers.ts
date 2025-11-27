/**
 * Type-Safe Mocking Utilities
 *
 * Helper utilities for Jest 29 modern mocking patterns.
 * Provides type-safe alternatives to manual casting with better IDE support.
 *
 * Usage:
 * ```typescript
 * import { mockService, mockFunction } from '__tests__/__helpers__/mockHelpers';
 *
 * // Type-safe function mocking
 * const mockGetData = mockFunction(service.getData);
 *
 * // Type-safe service mocking
 * const mockAnalytics = mockService(analytics);
 * ```
 */

import { jest } from '@jest/globals';

/**
 * Type-safe function mocking helper
 *
 * Wraps jest.mocked() with better error messages and type inference
 *
 * @example
 * const mockGetData = mockFunction(articlesService.getArticles);
 * mockGetData.mockResolvedValue([...]);
 */
export function mockFunction<T extends (...args: any[]) => any>(fn: T): jest.MockedFunction<T> {
  return jest.mocked(fn);
}

/**
 * Type-safe service/object mocking helper
 *
 * Mocks all methods of a service object
 *
 * @example
 * const mockAnalytics = mockService(analytics);
 * mockAnalytics.track.mockResolvedValue(undefined);
 */
export function mockService<T extends object>(service: T): jest.Mocked<T> {
  return jest.mocked(service);
}

/**
 * Create a typed mock with default return value
 *
 * Useful for mocking functions that should always return the same value
 *
 * @example
 * const mockIsStrugglingWord = mockWithDefault(isStrugglingWord, true);
 */
export function mockWithDefault<T extends (...args: any[]) => any>(
  fn: T,
  defaultValue: ReturnType<T>,
): jest.MockedFunction<T> {
  const mock = jest.mocked(fn);
  mock.mockReturnValue(defaultValue);
  return mock;
}

/**
 * Create a typed async mock with default resolved value
 *
 * Useful for mocking async functions that should always resolve
 *
 * @example
 * const mockFetch = mockAsyncWithDefault(fetchData, mockData);
 */
export function mockAsyncWithDefault<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultValue: Awaited<ReturnType<T>>,
): jest.MockedFunction<T> {
  const mock = jest.mocked(fn);
  mock.mockResolvedValue(defaultValue);
  return mock;
}
