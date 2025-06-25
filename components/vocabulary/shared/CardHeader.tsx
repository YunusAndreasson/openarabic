import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import TouchableIcon from '@/components/TouchableIcon';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';

interface CardHeaderProps {
  title: string;
  subtitle: string;
  onInfoPress: () => void;
}

export const CardHeader = memo(({ title, subtitle, onInfoPress }: CardHeaderProps) => {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.titleGroup}>
        <ThemedText style={styles.cardTitle} type="heading2" weight="bold">
          {title}
        </ThemedText>
        <ThemedText style={styles.cardSubtitle} type="caption" variant="secondary">
          {subtitle}
        </ThemedText>
      </View>
      <TouchableIcon
        icon="information-outline"
        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
        style={styles.infoIcon}
        touchSize="small"
        onPress={onInfoPress}
      />
    </View>
  );
});

CardHeader.displayName = 'CardHeader';

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  cardSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  cardTitle: {
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
      TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
    marginBottom: 0,
  },
  infoIcon: {
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
});
