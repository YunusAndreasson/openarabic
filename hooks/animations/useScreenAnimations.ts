/**
 * @deprecated Use useScreenAnimation instead. This file will be removed in a future version.
 */

import type { ScreenAnimationResult } from './useScreenAnimation';
import { useScreenAnimation } from './useScreenAnimation';

export type { ScreenAnimationResult };
export const useScreenAnimations = useScreenAnimation;
