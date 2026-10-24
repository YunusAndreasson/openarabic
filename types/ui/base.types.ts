import type {
  AccessibilityRole,
  AccessibilityState,
  Insets,
  PressableAndroidRippleConfig,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { AnimatedStyle, CSSStyle } from 'react-native-reanimated';

/**
 * The subset of pressable props the shared primitives actually pass down.
 *
 * Deliberately not `PressableProps`: react-native's and
 * react-native-gesture-handler's differ (their press and hover event types are
 * unrelated), so a prop typed as either one rejects the other component
 * outright. Naming only what is used keeps both assignable, which is the whole
 * point — see the `PressableComponent` prop on `BaseCard`, `GlassIconButton`
 * and `ListRow`.
 */
export interface PressableLikeProps {
  children?: React.ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** Either form both pressables accept, the pressed-state callback included. */
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  hitSlop?: number | Insets;
  disabled?: boolean;
  android_ripple?: PressableAndroidRippleConfig;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  testID?: string;
}

/**
 * Base props for components with style
 */
export interface BaseStyleProps {
  /** Optional style to apply to the component */
  style?: StyleProp<ViewStyle>;
}

/**
 * Base props for components with animated style
 */
export interface BaseAnimatedStyleProps {
  /** Optional style to apply to the component, supporting animated styles */
  style?: AnimatedStyle<ViewStyle> | StyleProp<ViewStyle>;
}

/**
 * Comprehensive base props combining style, pressable, and loading functionality
 * This consolidates the most common UI component patterns to reduce interface extension
 */
export interface BaseComponentProps extends BaseStyleProps {
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  /** Optional callback when the component is pressed */
  onPress?: () => void;
  /** Optional test identifier used for testing */
  testID?: string;
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Children to render inside the component */
  children?: React.ReactNode;
}

/**
 * Type to help with animated style casting
 */
export type AnimatedStyleProp<T> = AnimatedStyle<T> | StyleProp<T>;

/**
 * A view style for Reanimated 4's CSS API: keyframe animations (`animationName`,
 * `animationDuration`, …) and transitions (`transitionProperty`, …) on top of
 * the view's own style.
 *
 * Reanimated's own type, so a misspelt key, a keyframe that is not a style, or
 * a duration in the wrong unit is a compile error. It used to be
 * `ViewStyle & Record<string, unknown>`, which accepted all three — and needed
 * an `as` cast at half its call sites besides.
 */
export type ReanimatedCSSAnimationStyle = CSSStyle<ViewStyle>;
