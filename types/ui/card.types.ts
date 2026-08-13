import type { StyleProp, ViewStyle } from 'react-native';

import type { BaseComponentProps } from './base.types';

/** Which theme surface the card paints itself with. */
export type CardSurface = 'card' | 'elevation1' | 'elevation2';

/** Semantic elevation role, mirroring `ElevationRole` in lowercase. */
export type CardElevation = 'card' | 'floating' | 'hairline' | 'modal' | 'none';

/**
 * Props for the shared card surface.
 *
 * `loading` and `onLongPress` used to live here. Neither had a production call
 * site: `loading` rendered an empty card that no caller ever asked for, and
 * `onLongPress` went straight to the `Pressable`, bypassing the repeat-press
 * lock, the disabled check and the press animation that every other interaction
 * on this surface goes through. A press path with none of the press engine is a
 * bug waiting for its first caller, not an axis.
 */
export interface BaseCardProps extends Omit<BaseComponentProps, 'loading'> {
  /** Fired the moment a press starts — useful for prefetch hints */
  onPressIn?: () => void;
  /**
   * How high the card sits. Roles, not magnitudes — see `constants/elevation.ts`.
   * @default 'card'
   */
  elevation?: CardElevation;
  /**
   * Which theme surface to paint. `elevation1`/`elevation2` are for cards that
   * float over arbitrary content and need a contrast guarantee the page
   * background cannot give them.
   * @default 'card'
   */
  surface?: CardSurface;
  /**
   * Draw a hairline border. Dark mode suppresses shadows, so a surface that
   * genuinely has to separate itself from unknown content behind it needs a
   * stroke to do the job the shadow does in light and sepia.
   * @default false
   */
  bordered?: boolean;
  /** Additional styling for the content container */
  contentStyle?: StyleProp<ViewStyle>;
}
