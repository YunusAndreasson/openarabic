import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import moment from 'moment-hijri';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { LAYOUT } from '@/constants/layout';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';

interface IslamicEvent {
  name: string;
  month: number; // Hijri month (1-12)
  day: number; // Hijri day
}

// Main Islamic events (avoiding innovations)
const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: 'Ramadan', month: 9, day: 1 },
  { name: 'Eid al-Fitr', month: 10, day: 1 },
  { name: 'Hajj Season', month: 12, day: 8 },
  { name: 'Eid al-Adha', month: 12, day: 10 },
  { name: 'Muharram (New Year)', month: 1, day: 1 },
  { name: 'Ashura', month: 1, day: 10 },
];

// Arabic day names

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

function getNextIslamicEvent(): { event: IslamicEvent; daysUntil: number } | null {
  const today = moment();
  const currentHijriYear = today.iYear();

  let nextEvent: IslamicEvent | null = null;
  let minDaysUntil = Infinity;

  // Check events in current Hijri year
  for (const event of ISLAMIC_EVENTS) {
    const eventMoment = moment()
      .iYear(currentHijriYear)
      .iMonth(event.month - 1)
      .iDate(event.day);
    const daysUntil = eventMoment.diff(today, 'days');

    if (daysUntil >= 0 && daysUntil < minDaysUntil) {
      minDaysUntil = daysUntil;
      nextEvent = event;
    }
  }

  // If no events found in current year, check next year
  if (!nextEvent) {
    for (const event of ISLAMIC_EVENTS) {
      const eventMoment = moment()
        .iYear(currentHijriYear + 1)
        .iMonth(event.month - 1)
        .iDate(event.day);
      const daysUntil = eventMoment.diff(today, 'days');

      if (daysUntil < minDaysUntil) {
        minDaysUntil = daysUntil;
        nextEvent = event;
      }
    }
  }

  return nextEvent ? { event: nextEvent, daysUntil: minDaysUntil } : null;
}

export const WelcomeMessage: React.FC = () => {
  const colors = useColors();

  const welcomeData = useMemo(() => {
    // Get Hijri date
    const hijriMoment = moment();
    const hijriDay = hijriMoment.iDate();
    const hijriMonth = HIJRI_MONTHS[hijriMoment.iMonth()];
    const hijriYear = hijriMoment.iYear();

    // Get next Islamic event
    const nextEventInfo = getNextIslamicEvent();

    // Create the minimal date message without day name and without moon emoji
    const dateMessage = `${hijriDay} ${hijriMonth} ${hijriYear} AH`;

    // Create event message
    let eventMessage = '';
    if (nextEventInfo) {
      const daysText =
        nextEventInfo.daysUntil === 0
          ? 'today'
          : nextEventInfo.daysUntil === 1
            ? 'tomorrow'
            : `in ${nextEventInfo.daysUntil} days`;

      eventMessage = `${nextEventInfo.event.name} ${daysText}`;
    }

    return { dateMessage, eventMessage };
  }, []);

  const handleCalendarPress = () => {
    router.push('/islamic-calendar');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentGroup}>
        {welcomeData.eventMessage ? (
          <ThemedText
            type="overline"
            weight="normal"
            colorName="textTertiary"
            style={styles.eventText}
          >
            {welcomeData.eventMessage}
          </ThemedText>
        ) : null}
        <View style={styles.dateContainer}>
          <TouchableOpacity
            onPress={handleCalendarPress}
            style={styles.dateContainer}
            hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
            accessibilityLabel="View Islamic calendar"
            accessibilityHint="Opens the Islamic calendar with upcoming events"
          >
            <ThemedText type="body" weight="medium" colorName="text" style={styles.dateText}>
              {welcomeData.dateMessage}
            </ThemedText>
            <View style={styles.calendarButton} pointerEvents="none">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.textTertiary}
                style={styles.calendarIcon}
              />
              <Ionicons
                name="chevron-forward-outline"
                size={16}
                color={colors.textTertiary}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Establish screen rhythm - first element sets the tone
    paddingTop: LAYOUT.SPACING.XLARGE, // Increased from LARGE for better proportion (20px)
    paddingBottom: LAYOUT.SPACING.XXLARGE, // Increased from XLARGE for consistency (24px)
    paddingLeft: LAYOUT.SCREEN_EDGE_PADDING, // Align with screen content padding
    paddingRight: 0, // No right padding needed
    alignItems: 'flex-start',
  },
  contentGroup: {
    // Group related elements using proximity principle
    alignItems: 'flex-start',
    gap: LAYOUT.SPACING.XSMALL, // Tight grouping for related information
  },
  eventText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.3,
    letterSpacing: 1.5,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    textAlign: 'left',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.3,
    letterSpacing: 0.2,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XSMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    opacity: LAYOUT.OPACITY.HIGH,
    marginLeft: LAYOUT.SPACING.XTINY,
    gap: LAYOUT.SPACING.XTINY,
  },
  calendarIcon: {
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  chevronIcon: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
});
