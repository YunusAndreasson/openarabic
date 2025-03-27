import { useOpacityAnimation } from './useOpacityAnimation';

/**
 * A simple hook that wraps useOpacityAnimation for backward compatibility
 * Use useOpacityAnimation directly for new code
 *
 * @param initialOpacity Initial opacity value (0-1)
 * @returns Animation controls for fading elements
 */
export function useFadeAnimation(initialOpacity: number) {
  return useOpacityAnimation({ initialOpacity });
}

export default useFadeAnimation;
