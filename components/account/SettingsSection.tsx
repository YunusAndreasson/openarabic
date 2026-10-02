import type { ReactNode } from 'react';
import { Children, isValidElement, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard, ListSeparator, SectionLabel } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface SettingsSectionProps {
  title: string;
  /**
   * A caveat the whole group shares, shown under the label.
   *
   * Prefer this to repeating the same qualifier on every row: "Applies to
   * article audio and playlists" on the Listening section is what lets its two
   * rows stay one word long. Leave it off when the label already says it.
   */
  subtitle?: string;
  children: ReactNode;
}

/**
 * Reusable section container for Account screen
 * Handles section title + card wrapper + dividers between items
 */
export const SettingsSection = memo(({ title, subtitle, children }: SettingsSectionProps) => {
  // Add dividers between children
  const childrenArray = Children.toArray(children);
  const childrenWithDividers = childrenArray.reduce<ReactNode[]>((acc, child, index) => {
    acc.push(child);
    if (index < childrenArray.length - 1) {
      // Use child key to generate unique divider key (safer than index)
      const childKey = isValidElement(child) && child.key ? child.key : index;
      acc.push(<Divider key={`divider-${childKey}`} />);
    }
    return acc;
  }, []);

  return (
    <>
      {/* No style override: `density="comfortable"` is already the 24/8 rhythm
          this used to restate by hand. */}
      <SectionLabel title={title} subtitle={subtitle} />
      <BaseCard style={styles.sectionContainer}>
        <View style={styles.linksContainer}>{childrenWithDividers}</View>
      </BaseCard>
    </>
  );
});

SettingsSection.displayName = 'SettingsSection';

// The rule between rows, inset past the icon column so it lines up with the
// row labels. Wraps the shared ListSeparator rather than re-declaring a View.
const Divider = memo(() => {
  const colors = useColors();
  return (
    <ListSeparator
      color={colors.cardBorder}
      height={ListSeparator.RULE_HEIGHT}
      inset={DIVIDER_INSET}
      style={styles.divider}
    />
  );
});
Divider.displayName = 'Divider';

/** Card padding + icon padding + icon + icon padding + text margin. */
const DIVIDER_INSET =
  LAYOUT.SPACING.MEDIUM +
  LAYOUT.SPACING.SMALL +
  LAYOUT.BUTTON.ICON_SIZE.MEDIUM +
  LAYOUT.SPACING.SMALL +
  LAYOUT.SPACING.MEDIUM;

const styles = StyleSheet.create({
  sectionContainer: {
    overflow: 'hidden',
  },
  linksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  divider: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});
