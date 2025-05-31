import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment-hijri';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { LAYOUT } from '@/constants/layout';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';

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
    router.push('/islamic-calendar');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleCalendarPress}
        style={styles.dateContainer}
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
        accessibilityLabel="View Islamic calendar"
        accessibilityHint="Opens the Islamic calendar with upcoming events"
      >
        <ThemedText type="caption" weight="normal" colorName="textTertiary" style={styles.dateText}>
          {dateMessage}
        </ThemedText>
        <Ionicons
          name="calendar-outline"
          size={14}
          color={colors.textTertiary}
          style={styles.calendarIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING,
    paddingRight: 0,
    alignItems: 'flex-start',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    opacity: 0.6,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.2,
    letterSpacing: 0.1,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
    fontWeight: '400',
  },
  calendarIcon: {
    opacity: 0.8,
  },
});
