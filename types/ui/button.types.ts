import type { GestureResponderEvent, PressableProps } from 'react-native';

import type { IoniconName } from '@/components/ui/Icon';
import type { HapticType } from '@/hooks/ui/useButtonPress';

import type { BaseAnimatedStyleProps } from './base.types';

/**
 * How much visual weight a button carries, loudest first.
 *
 * - `filled`   — the one primary action on a screen. Solid hue.
 * - `tonal`    — a secondary action that still needs to read as an action.
 *                Hue mixed into an elevation surface, so it stays recognisable
 *                on the dark theme where a translucent fill would go muddy.
 * - `outlined` — a peer action alongside a `filled` one.
 * - `ghost`    — tertiary: "Not now", "Skip", inline links. No fill, no border.
 */
type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'ghost';

/**
 * Which hue a button paints itself with. Orthogonal to `variant`, so a
 * destructive action can be quiet (`ghost`) or loud (`filled`) without needing
 * its own variant.
 */
export type ButtonTone = 'default' | 'destructive';

/**
 * Button size options
 */
type ButtonSize = 'large' | 'medium' | 'small';

/**
 * The button's corner treatment. Orthogonal to `size` and `variant`.
 *
 * - `rounded` — the app radius. Every button in a row, every button inside a
 *   card or sheet.
 * - `pill` — fully rounded, reserved for a standalone prominent CTA with no
 *   peers beside it (the pinned tab-screen action, the review screen's reveal
 *   button when it is alone). Two shapes in one row read as two different
 *   controls, so loudness in a row is carried by the fill, not the radius.
 */
type ButtonShape = 'rounded' | 'pill';

/** Where the icon sits relative to the label. */
type ButtonIconPosition = 'leading' | 'trailing';

/**
 * Base button props shared across all button variants
 */
interface BaseButtonProps
  extends Omit<PressableProps, 'style' | 'onPress'>, BaseAnimatedStyleProps {
  /**
   * Press handler. The gesture event is optional because the shared press
   * engine also drives buttons that are activated without one.
   */
  onPress?: (event?: GestureResponderEvent) => void;
  /** Text displayed on the button */
  title: string;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Size variant of the button */
  size?: ButtonSize;
  /** Corner treatment (default: 'rounded') */
  shape?: ButtonShape;
  /** Stretch to fill the available width instead of hugging the label */
  fullWidth?: boolean;
  /** Haptic weight fired on press (default: 'light') */
  hapticType?: HapticType;
}

/**
 * The icon slot a ThemedButton can carry. NOT the props of the standalone
 * `IconButton` component — that has its own, different, local interface.
 */
interface ButtonIconProps {
  /** Optional Ionicons icon name to display alongside the title */
  icon?: IoniconName;
  /** Which side of the label the icon sits on (default: 'leading') */
  iconPosition?: ButtonIconPosition;
}

/**
 * Simplified ThemedButton props - variant is now optional with 'filled' as default
 */
export interface ThemedButtonProps extends BaseButtonProps, ButtonIconProps {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
  /** Which hue the button paints itself with (default: 'default') */
  tone?: ButtonTone;
}
