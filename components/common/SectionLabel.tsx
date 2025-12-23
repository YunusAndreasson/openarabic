import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';

interface SectionLabelProps {
  /** The label text (will be uppercased automatically) */
  title: string;
  /** Optional container style override */
  style?: StyleProp<ViewStyle>;
}

/**
 * Subtle uppercase section label for filter lists and grouped content.
 * Uses caption typography with reduced opacity for visual hierarchy.
 *
 * Example: CATEGORIES, AUTHORS, DIFFICULTY, CONTINUE READING, UNREAD
 */
export const SectionLabel: FC<SectionLabelProps> = ({ title, style }) => (
  <View style={[styles.container, style]}>
    <ThemedText type="caption" variant="secondary" style={styles.label}>
      {title}
    </ThemedText>
  </View>
);

SectionLabel.displayName = 'SectionLabel';

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.LARGE, // 16px
    paddingBottom: LAYOUT.SPACING.SMALL, // 8px
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING, // 12px
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: LAYOUT.OPACITY.PRESSED,
  },
});
