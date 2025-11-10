import { createContext, useContext } from 'react';

import type { ToastType } from '@/types/enums';

/**
 * Context for review screen toast (works inside modal)
 * Provides toast functionality isolated to the review screen
 */
export interface ReviewToastContextType {
  showToast: (message: string, duration?: number, type?: ToastType) => void;
}

export const ReviewToastContext = createContext<ReviewToastContextType | null>(null);

/**
 * Hook to access review screen toast functionality
 * Must be used within ReviewContent component
 */
export const useReviewToast = (): ReviewToastContextType => {
  const context = useContext(ReviewToastContext);
  if (!context) {
    throw new Error('useReviewToast must be used within ReviewContent');
  }
  return context;
};
