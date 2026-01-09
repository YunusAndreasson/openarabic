/**
 * Hook Tests - useReviewToast
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  ReviewToastContext,
  useReviewToast,
  type ReviewToastContextType,
} from '@/hooks/review/useReviewToast';

describe('useReviewToast', () => {
  describe('Context validation', () => {
    it('should throw error when used outside ReviewContent', () => {
      expect(() => renderHook(() => useReviewToast())).toThrow(
        'useReviewToast must be used within ReviewContent',
      );
    });

    it('should return context when inside ReviewToastContext.Provider', () => {
      const mockShowToast = jest.fn();
      const mockContext: ReviewToastContextType = {
        showToast: mockShowToast,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ReviewToastContext.Provider value={mockContext}>{children}</ReviewToastContext.Provider>
      );

      const { result } = renderHook(() => useReviewToast(), { wrapper });

      expect(result.current).toBe(mockContext);
      expect(result.current.showToast).toBe(mockShowToast);
    });
  });

  describe('showToast function', () => {
    it('should expose showToast function from context', () => {
      const mockShowToast = jest.fn();
      const mockContext: ReviewToastContextType = {
        showToast: mockShowToast,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ReviewToastContext.Provider value={mockContext}>{children}</ReviewToastContext.Provider>
      );

      const { result } = renderHook(() => useReviewToast(), { wrapper });

      result.current.showToast('Test message');

      expect(mockShowToast).toHaveBeenCalledWith('Test message');
    });

    it('should pass through duration and type arguments', () => {
      const mockShowToast = jest.fn();
      const mockContext: ReviewToastContextType = {
        showToast: mockShowToast,
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ReviewToastContext.Provider value={mockContext}>{children}</ReviewToastContext.Provider>
      );

      const { result } = renderHook(() => useReviewToast(), { wrapper });

      result.current.showToast('Test message', 3000, 'success' as never);

      expect(mockShowToast).toHaveBeenCalledWith('Test message', 3000, 'success');
    });
  });
});
