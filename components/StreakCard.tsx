import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';

interface StreakCardProps {
  streak?: number;
  colors: any;
}

export const StreakCard = React.memo(({ streak = 5, colors }: StreakCardProps) => {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.statContent}>
        <View style={styles.statTextContainer}>
          <ThemedText style={styles.statValue}>{streak}</ThemedText>
          <ThemedText style={styles.statLabel}>Day Streak</ThemedText>
        </View>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.text + '10', borderColor: colors.cardBorder + '40' },
          ]}
        >
          <Ionicons name="flame" size={24} color={colors.icon} />
        </View>
      </View>
    </View>
  );
});

StreakCard.displayName = 'StreakCard';

const styles = StyleSheet.create({
  statCard: {
    width: '48%',
    height: 90,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
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
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
});
