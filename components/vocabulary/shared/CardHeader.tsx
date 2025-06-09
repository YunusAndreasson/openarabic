import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';


import { ThemedText } from '@/components/ThemedText';
import TouchableIcon from '@/components/TouchableIcon';
import { LAYOUT } from '@/constants/layout';

interface CardHeaderProps {
  title: string;
  subtitle: string;
  onInfoPress: () => void;
}

export const CardHeader = memo(({ title, subtitle, onInfoPress }: CardHeaderProps) => {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.titleGroup}>
        <ThemedText style={styles.cardTitle} type="heading3" weight="bold">
          {title}
        </ThemedText>
        <ThemedText style={styles.cardSubtitle} type="caption" variant="secondary">
          {subtitle}
        </ThemedText>
      </View>
      <TouchableIcon
        name="information-outline"
        size={18}
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
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  cardSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.TINY,
  },
  cardTitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
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
