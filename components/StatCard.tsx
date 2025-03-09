import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  colors: any;
}

export const StatCard = React.memo(({ label, value, icon, colors }: StatCardProps) => {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.statContent}>
        <View style={styles.statTextContainer}>
          <ThemedText style={styles.statValue}>{value}</ThemedText>
          <ThemedText style={styles.statLabel}>{label}</ThemedText>
        </View>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.text + '10', borderColor: colors.cardBorder + '40' },
          ]}
        >
          <Ionicons name={icon as any} size={24} color={colors.icon} />
        </View>
      </View>
    </View>
  );
});

StatCard.displayName = 'StatCard';

const styles = StyleSheet.create({
  statCard: {
    width: '48%',
    height: 90,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  statContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
});
