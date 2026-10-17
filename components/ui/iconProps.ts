import type { AccessibilityProps, ColorValue, StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/constants/icons';

/**
 * What a caller may set on an icon's box: where it sits, never how it draws.
 * The keys both platforms' views share — SF Symbols render as a native view,
 * the Android glyph and the brand logos as Text, and RN types ViewStyle and
 * TextStyle incompatibly beyond these.
 */
export type IconStyle = Pick<
  ViewStyle,
  | 'margin'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'marginHorizontal'
  | 'marginVertical'
  | 'marginStart'
  | 'marginEnd'
  | 'position'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'alignSelf'
  | 'flexShrink'
  | 'opacity'
  | 'transform'
  | 'zIndex'
>;

/**
 * Props shared by both platform implementations of `Icon`. A separate module
 * because `./Icon` resolves to `Icon.android.tsx` itself on Android.
 */
export interface IconProps extends AccessibilityProps {
  name: IconName;
  /** Edge of the square the symbol is drawn in. */
  size?: number;
  color?: ColorValue;
  style?: StyleProp<IconStyle>;
  testID?: string;
}

/** The symbol grid both symbol sets are drawn on. */
export const DEFAULT_ICON_SIZE = 24;
