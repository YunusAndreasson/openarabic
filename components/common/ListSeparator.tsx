import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';

interface ListSeparatorProps {
  height?: number;
  /**
   * Paints the separator instead of leaving empty space. Omit it for a plain
   * gap between cards; pass a theme border colour for a visible rule.
   */
  color?: string;
  /**
   * Indent the rule from the left, to line it up with text past an icon
   * column. A rule that runs under the icon reads as a table border.
   */
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one divider in the app — as a gap between cards, or as a painted rule
 * between rows.
 *
 * Three other mechanisms for the same line existed alongside it: a locally
 * defined `Divider` memo in the settings section, an inline `View` with a
 * background colour on the word screen, and a pair of flanking `dividerLine`
 * views in the auth buttons. They disagreed on weight — some drew
 * `BORDER.WIDTH.NORMAL` (1pt), others `StyleSheet.hairlineWidth` (~0.5pt) — so
 * the same rule was visibly heavier on some screens than others. Hairline wins:
 * it is what the platform draws for a list separator.
 */
export function ListSeparator({
  height = LAYOUT.SPACING.MEDIUM,
  color,
  inset,
  style,
}: ListSeparatorProps) {
  // A bare object when nothing extra is passed — the common case, and it keeps
  // the rendered style introspectable rather than a one-element array.
  const base = { height, backgroundColor: color, marginLeft: inset };
  return <View style={style ? [base, style] : base} />;
}

/** The height of a painted rule. Pair with a `color`. */
ListSeparator.RULE_HEIGHT = StyleSheet.hairlineWidth;
