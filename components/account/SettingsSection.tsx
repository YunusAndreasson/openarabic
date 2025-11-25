import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BaseCard } from '@/components/common';
import { SectionTitle } from '@/components/common';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
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
          borderWidth: 1,
          borderColor: colors.error,
          backgroundColor: `${colors.error}26`,
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
      <SectionTitle title={title} textStyle={styles.sectionTitle} />
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
    width: '100%',
  },
  sectionTitle: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    marginBottom: LAYOUT.SPACING.TINY,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    letterSpacing: 0.6,
    opacity: LAYOUT.OPACITY.HIGH,
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
  },
});
