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

/**
 * Type-safe mock for class constructors
 *
 * @example
 * const MockedService = mockClass(MyService);
 * const instance = new MockedService();
 */
export function mockClass<T extends new (...args: any[]) => any>(
  constructor: T,
): jest.MockedClass<T> {
  return jest.mocked(constructor);
}

/**
 * Batch create mocks for multiple service methods
 *
 * @example
 * const mocks = mockMethods(articlesService, ['getArticles', 'getArticleById']);
 * mocks.getArticles.mockResolvedValue([]);
 */
export function mockMethods<T extends object, K extends keyof T>(
  service: T,
  methods: K[],
): { [P in K]: T[P] extends (...args: any[]) => any ? jest.MockedFunction<T[P]> : never } {
  const result = {} as any;
  for (const method of methods) {
    if (typeof service[method] === 'function') {
      result[method] = jest.mocked(service[method] as any);
    }
  }
  return result;
}

/**
 * Helper to verify mock was called with exact parameters
 *
 * Provides better error messages than toHaveBeenCalledWith
 *
 * @example
 * expectCalledWith(mockFn, ['param1', 'param2']);
 */
export function expectCalledWith<T extends (...args: any[]) => any>(
  mock: jest.MockedFunction<T>,
  args: Parameters<T>,
): void {
  expect(mock).toHaveBeenCalledWith(...args);
}

/**
 * Helper to verify async mock resolved with value
 *
 * @example
 * await expectResolvedWith(mockAsyncFn, expectedValue);
 */
export async function expectResolvedWith<T>(
  mock: jest.MockedFunction<(...args: any[]) => Promise<T>>,
  expected: T,
): Promise<void> {
  const result = await mock.mock.results[mock.mock.results.length - 1]?.value;
  expect(result).toEqual(expected);
}

/**
 * Helper to create a spy with type safety
 *
 * @example
 * const spy = createSpy(console, 'log');
 * spy.mockImplementation(() => {});
 */
export function createSpy<T extends object, K extends keyof T>(
  object: T,
  method: K,
): T[K] extends (...args: any[]) => any
  ? jest.SpyInstance<ReturnType<T[K]>, Parameters<T[K]>>
  : never {
  return jest.spyOn(object, method as any) as any;
}

/**
 * Mock implementation helper with type inference
 *
 * @example
 * mockImplementation(service.getData, async (id) => {
 *   // TypeScript infers parameter types!
 *   return mockData[id];
 * });
 */
export function mockImplementation<T extends (...args: any[]) => any>(
  fn: T,
  implementation: T,
): jest.MockedFunction<T> {
  const mock = jest.mocked(fn);
  mock.mockImplementation(implementation);
  return mock;
}

/**
 * Reset all mocks for a service object
 *
 * @example
 * resetServiceMocks(articlesService, ['getArticles', 'getArticleById']);
 */
export function resetServiceMocks<T extends object, K extends keyof T>(
  service: T,
  methods: K[],
): void {
  for (const method of methods) {
    if (typeof service[method] === 'function') {
      jest.mocked(service[method] as any).mockReset();
    }
  }
}

/**
 * Clear all mocks for a service object
 *
 * @example
 * clearServiceMocks(articlesService, ['getArticles', 'getArticleById']);
 */
export function clearServiceMocks<T extends object, K extends keyof T>(
  service: T,
  methods: K[],
): void {
  for (const method of methods) {
    if (typeof service[method] === 'function') {
      jest.mocked(service[method] as any).mockClear();
    }
  }
}

/**
 * Type guard to check if value is a mocked function
 *
 * @example
 * if (isMockedFunction(fn)) {
 *   fn.mockReturnValue(value);
 * }
 */
export function isMockedFunction<T extends (...args: any[]) => any>(
  fn: T | jest.MockedFunction<T>,
): fn is jest.MockedFunction<T> {
  return typeof fn === 'function' && 'mock' in fn;
}

/**
 * Create a mock that counts calls and returns different values
 *
 * @example
 * const mock = mockWithSequence(service.getData, [value1, value2, value3]);
 * // First call returns value1, second returns value2, etc.
 */
export function mockWithSequence<T extends (...args: any[]) => any>(
  fn: T,
  values: ReturnType<T>[],
): jest.MockedFunction<T> {
  const mock = jest.mocked(fn);
  let callCount = 0;
  mock.mockImplementation(() => {
    const value = values[callCount] ?? values[values.length - 1];
    callCount++;
    return value;
  });
  return mock;
}

/**
 * Create an async mock that resolves with different values per call
 *
 * @example
 * const mock = mockAsyncWithSequence(service.fetchData, [data1, data2, data3]);
 */
export function mockAsyncWithSequence<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  values: Awaited<ReturnType<T>>[],
): jest.MockedFunction<T> {
  const mock = jest.mocked(fn);
  let callCount = 0;
  mock.mockImplementation(async () => {
    const value = values[callCount] ?? values[values.length - 1];
    callCount++;
    return value;
  });
  return mock;
}
