import { useEffect } from 'react';

/**
 * Hook to dynamically update the page title in client components
 * @param title - The title to set for the page
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
