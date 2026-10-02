import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { STATUS_INDICATOR } from '@/constants/layout';

interface DotProps {
  /** The dot's fill. Always explicit — a dot with no colour says nothing. */
  color: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A small status dot — difficulty on a dictionary row, a step marker in the
 * tutorial, a legend swatch on a chart.
 *
 * Four files carried byte-identical copies of the same three-property style
 * block. `flexShrink: 0` is in here rather than at the call site because a dot
 * that shrinks is a dot that has stopped being round.
 */
export const Dot = ({ color, style }: DotProps) => (
  <View style={[styles.dot, { backgroundColor: color }, style]} />
);

const styles = StyleSheet.create({
  dot: {
    width: STATUS_INDICATOR.DOT_SIZE,
    height: STATUS_INDICATOR.DOT_SIZE,
    borderRadius: STATUS_INDICATOR.DOT_RADIUS,
    flexShrink: 0,
  },
});

Dot.displayName = 'Dot';
