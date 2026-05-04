import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard, SectionLabel } from '@/components/common';
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

// Divider component
const Divider = memo(() => {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />;
});
Divider.displayName = 'Divider';

const styles = StyleSheet.create({
  sectionContainer: {
    overflow: 'hidden',
  },
  linksContainer: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  divider: {
    height: LAYOUT.BORDER.WIDTH.THIN,
    opacity: LAYOUT.OPACITY.MEDIUM,
    // Inset to align with text (skip icon column): card padding + icon padding + icon + icon padding + text margin
    marginLeft:
      LAYOUT.SPACING.MEDIUM +
      LAYOUT.SPACING.SMALL +
      LAYOUT.BUTTON.ICON_SIZE.MEDIUM +
      LAYOUT.SPACING.SMALL +
      LAYOUT.SPACING.MEDIUM,
  },
  sectionLabelOverride: {
    paddingTop: LAYOUT.SPACING.XLARGE,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
});
