import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

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
        style={[styles.infoIcon, { backgroundColor: colors.textOverlay }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="information-outline" size={18} color={colors.textTertiary} />
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
    padding: LAYOUT.SPACING.SMALL,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});
