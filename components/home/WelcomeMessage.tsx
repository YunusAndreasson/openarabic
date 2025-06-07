import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import moment from 'moment-hijri';
import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

// Hijri month names
const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

export const WelcomeMessage: React.FC = () => {
  const colors = useColors();

  const dateMessage = useMemo(() => {
    // Get Hijri date
    const hijriMoment = moment();
    const hijriDay = hijriMoment.iDate();
    const hijriMonth = HIJRI_MONTHS[hijriMoment.iMonth()];
    const hijriYear = hijriMoment.iYear();

    // Create the minimal date message
    return `${hijriDay} ${hijriMonth} ${hijriYear} AH`;
  }, []);

  const handleCalendarPress = () => {
    router.push('/(tabs)/read/account/islamicCalendar');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityHint="Opens Islamic calendar"
        accessibilityLabel="View Islamic calendar"
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
        style={styles.dateContainer}
        onPress={handleCalendarPress}
      >
        <ThemedText colorName="textTertiary" style={styles.dateText} type="caption" weight="normal">
          {dateMessage}
        </ThemedText>
        <Ionicons
          color={colors.textTertiary}
          name="chevron-forward-outline"
          size={16}
          style={styles.chevronIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  chevronIcon: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  container: {
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  dateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    opacity: 0.6,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontVariant: ['tabular-nums'],
    fontWeight: '400',
    letterSpacing: 0.1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    textAlign: 'center',
  },
});
