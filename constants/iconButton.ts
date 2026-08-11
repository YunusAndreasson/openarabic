import { StyleSheet } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';

/**
 * The one size scale for circular icon buttons.
 *
 * `IconButton` (filled) and `HeaderIconButton` (transparent) used to size
 * themselves independently — one took a numeric `iconSize`, the other a
 * `'small' | 'medium' | 'large'` token — so two controls that look identical on
 * screen had no shared definition of what "medium" meant. Both read this now.
 */
export type IconButtonSize = 'small' | 'medium' | 'large';

const containers = StyleSheet.create({
  small: {
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    height: MIN_TOUCH_TARGET.SMALL,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.SMALL,
  },
  medium: {
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    height: MIN_TOUCH_TARGET.MEDIUM,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.MEDIUM,
  },
  large: {
    alignItems: 'center',
    borderRadius: MIN_TOUCH_TARGET.LARGE / 2,
    height: MIN_TOUCH_TARGET.LARGE,
    justifyContent: 'center',
    width: MIN_TOUCH_TARGET.LARGE,
  },
});

export const ICON_BUTTON_SIZES = {
  small: {
    container: containers.small,
    dimension: MIN_TOUCH_TARGET.SMALL,
    iconSize: LAYOUT.BUTTON.ICON_SIZE.SMALL,
    // 32pt is under the 44pt minimum; slop makes up the difference.
    hitSlop: LAYOUT.HIT_SLOP.SMALL,
    rippleSize: 'small',
  },
  medium: {
    container: containers.medium,
    dimension: MIN_TOUCH_TARGET.MEDIUM,
    iconSize: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
    hitSlop: LAYOUT.HIT_SLOP.MEDIUM,
    rippleSize: 'medium',
  },
  large: {
    container: containers.large,
    dimension: MIN_TOUCH_TARGET.LARGE,
    iconSize: LAYOUT.BUTTON.ICON_SIZE.LARGE,
    hitSlop: LAYOUT.HIT_SLOP.LARGE,
    rippleSize: 'medium',
  },
} as const;
