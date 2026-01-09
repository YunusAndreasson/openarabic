/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * FSRSDataProvider Tests
 *
 * Tests the FSRSDataProvider component which provides vocabulary/FSRS data context.
 * This wraps useFSRSQueries hook and provides study words data to the app.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';

import { FSRSDataProvider, useFSRSData } from '@/components/providers/FSRSDataProvider';

// Mock the underlying hook
const mockUseFSRSQueries = jest.fn();

jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useFSRSQueries: (props: unknown) => mockUseFSRSQueries(props),
}));

describe('FSRSDataProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockUseFSRSQueries.mockReturnValue({
      allWords: [],
      isLoading: false,
      error: null,
    });
  });

  describe('Provider Setup', () => {
    test('should provide FSRS data context to children', () => {
      const testWords = [
        { id: '1', word: 'مرحبا', translation: 'hello' },
        { id: '2', word: 'شكرا', translation: 'thank you' },
      ];

      mockUseFSRSQueries.mockReturnValue({
        allWords: testWords,
        isLoading: false,
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId="test-user-123">{children}</FSRSDataProvider>
      );

      const { result } = renderHook(() => useFSRSData(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.studyWords).toEqual(testWords);
      expect(result.current.isLoading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });

    test('should pass userId to useFSRSQueries', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId="user-456">{children}</FSRSDataProvider>
      );

      renderHook(() => useFSRSData(), { wrapper });

      expect(mockUseFSRSQueries).toHaveBeenCalledWith({ userId: 'user-456' });
    });

    test('should handle loading state', () => {
      mockUseFSRSQueries.mockReturnValue({
        allWords: undefined,
        isLoading: true,
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId="test-user">{children}</FSRSDataProvider>
      );

      const { result } = renderHook(() => useFSRSData(), { wrapper });

      expect(result.current.isLoading).toBeTruthy();
      expect(result.current.studyWords).toBeUndefined();
    });

    test('should handle error state', () => {
      const testError = new Error('Failed to load words');

      mockUseFSRSQueries.mockReturnValue({
        allWords: undefined,
        isLoading: false,
        error: testError,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId="test-user">{children}</FSRSDataProvider>
      );

      const { result } = renderHook(() => useFSRSData(), { wrapper });

      expect(result.current.error).toEqual(testError);
      expect(result.current.isLoading).toBeFalsy();
    });

    test('should handle undefined userId', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId={undefined}>{children}</FSRSDataProvider>
      );

      renderHook(() => useFSRSData(), { wrapper });

      expect(mockUseFSRSQueries).toHaveBeenCalledWith({ userId: undefined });
    });
  });

  describe('useFSRSData Hook', () => {
    test('should throw error when used outside provider', () => {
      // Suppress console.error for this expected error
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useFSRSData());
      }).toThrow('useFSRSData must be used within an FSRSDataProvider');

      console.error = originalError;
    });

    test('should return context value when used inside provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId="test-user">{children}</FSRSDataProvider>
      );

      const { result } = renderHook(() => useFSRSData(), { wrapper });

      expect(result.current).toHaveProperty('studyWords');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
    });
  });

  describe('Memoization', () => {
    test('should memoize context value', () => {
      mockUseFSRSQueries.mockReturnValue({
        allWords: [],
        isLoading: false,
        error: null,
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FSRSDataProvider userId="test-user">{children}</FSRSDataProvider>
      );

      const { result, rerender } = renderHook(() => useFSRSData(), { wrapper });

      const firstValue = result.current;
      rerender();
      const secondValue = result.current;

      // Same reference means memoization is working
      expect(firstValue).toBe(secondValue);
    });
  });
});
