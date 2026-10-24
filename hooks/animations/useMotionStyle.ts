import { useReducedMotion } from 'react-native-reanimated';

/**
 * The app's one Reduce Motion rule for Reanimated's CSS API: movement is gated,
 * opacity is not.
 *
 * Reduce Motion asks for less *movement*. iOS makes the intended substitution
 * explicit — its companion setting is "Prefer Cross-Fade Transitions" — so a
 * fade or a breathing opacity is exactly what the setting leaves a learner
 * with, never something to remove. A slide, a scale or a growing width is what
 * they turned it on for.
 *
 * Shared-value animations (`withTiming`, the layout builders) follow the system
 * setting on their own. The CSS API does not — Reanimated 4.7 still has no
 * reduced-motion handling in it — so a CSS style that moves goes through here:
 * `animated` when motion is allowed, `reduced` (nothing, by default) when it is
 * not. A style that only changes opacity does not need this, and passing one
 * through it would remove a cue the setting means to keep.
 */
export function useMotionStyle<T>(animated: T, reduced: T | null = null): T | null {
  return useReducedMotion() ? reduced : animated;
}
