import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard, ListSeparator, SectionLabel } from '@/components/common';
import { OPACITY_HEX } from '@/constants/colors';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  dangerZone?: boolean;
}

/**
 * Reusable section container for Account screen
 * Handles section title + card wrapper + dividers between items
 */
export const SettingsSection = memo(({ title, children, dangerZone }: SettingsSectionProps) => {
  const colors = useColors();

  const sectionStyle = dangerZone
    ? [
        styles.sectionContainer,
        {
          overflow: 'hidden' as const,
          borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
          borderColor: colors.error,
          backgroundColor: `${colors.error}${OPACITY_HEX.LOW}`,
        },
      ]
    : styles.sectionContainer;

  // Add dividers between children
  const childrenArray = React.Children.toArray(children);
  const childrenWithDividers = childrenArray.reduce<React.ReactNode[]>((acc, child, index) => {
    acc.push(child);
    if (index < childrenArray.length - 1) {
      // Use child key to generate unique divider key (safer than index)
      const childKey = React.isValidElement(child) && child.key ? child.key : index;
      acc.push(<Divider key={`divider-${childKey}`} />);
    }
    return acc;
  }, []);

  return (
    <>
      <SectionLabel title={title} style={styles.sectionLabelOverride} />
      <BaseCard shadowSize="small" style={sectionStyle}>
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
  sectionLabelOverride: {
    paddingTop: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
});
