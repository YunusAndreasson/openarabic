import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { withOpacity } from '@/utils/colorUtils';

import { ThemedText } from '../../ThemedText';

interface CardHeaderProps {
  title: string;
  subtitle: string;
  onInfoPress: () => void;
}

export const CardHeader = memo(({ title, subtitle, onInfoPress }: CardHeaderProps) => {
  const colors = useColors();

  return (
    <View style={styles.cardHeader}>
      <View style={styles.titleGroup}>
        <ThemedText type="heading3" weight="bold" style={styles.cardTitle}>
          {title}
        </ThemedText>
        <ThemedText type="caption" variant="secondary" style={styles.cardSubtitle}>
          {subtitle}
        </ThemedText>
      </View>
      <TouchableOpacity
        onPress={onInfoPress}
        style={[styles.infoIcon, { backgroundColor: withOpacity(colors.textTertiary, 0.1) }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="information-outline" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
});

CardHeader.displayName = 'CardHeader';

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  cardTitle: {
    marginBottom: 0,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.2,
  },
  cardSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    marginTop: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  infoIcon: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.SMALL,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
