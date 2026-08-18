import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import type { FC } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

type SectionLabelDensity = 'comfortable' | 'compact' | 'first';

interface SectionLabelProps {
  /** The label text, in sentence case */
  title: string;
  /** Optional subtitle displayed below the title in secondary color */
  subtitle?: string;
  /** Optional container style override */
  style?: StyleProp<ViewStyle>;
  /**
   * Vertical rhythm:
   * - `comfortable` (default): 24px top — clear separation between top-level sections
   * - `compact`: 16px top — for back-to-back rails inside the same group
   * - `first`: 12px top — for the first section on a screen (avoids extra gap below header)
   */
  density?: SectionLabelDensity;
}

const DENSITY_TOP_PADDING: Record<SectionLabelDensity, number> = {
  comfortable: LAYOUT.SPACING.XLARGE, // 24
  compact: LAYOUT.SPACING.LARGE, // 16
  first: LAYOUT.SPACING.MEDIUM, // 12
};

/**
 * Quiet section label for filter lists and grouped content.
 *
 * Example: Topics, Continue reading, Featured, Appearance.
 */
export const SectionLabel: FC<SectionLabelProps> = ({
  title,
  subtitle,
  style,
  density = 'comfortable',
}) => (
  <View style={[styles.container, { paddingTop: DENSITY_TOP_PADDING[density] }, style]}>
    <ThemedText type="overline">{title}</ThemedText>
    {subtitle ? (
      <ThemedText type="caption" colorName="secondaryText" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    ) : null}
  </View>
);

SectionLabel.displayName = 'SectionLabel';

const styles = StyleSheet.create({
  container: {
    paddingBottom: LAYOUT.SPACING.SMALL, // 8px
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING, // 12px
  },
  subtitle: {
    marginTop: LAYOUT.SPACING.TINY, // 4px
  },
});
