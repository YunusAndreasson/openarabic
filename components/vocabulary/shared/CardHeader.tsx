import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

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
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
    width: 32,
  },
  titleGroup: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  },
});
