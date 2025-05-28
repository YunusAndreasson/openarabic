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
const ARABIC_DAYS = [
  'al-Ahad', // Sunday
  'al-Ithnayn', // Monday
  'ath-Thulatha', // Tuesday
  "al-Arba'a", // Wednesday
  'al-Khamis', // Thursday
  "al-Jumu'ah", // Friday
  'as-Sabt', // Saturday
];

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

function getArabicTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return 'Sabah al-khayr'; // Good morning
  } else if (hour >= 12 && hour < 15) {
    return 'Masa al-khayr'; // Good afternoon
  } else if (hour >= 15 && hour < 18) {
    return "Asr sa'eed"; // Happy afternoon
  } else if (hour >= 18 && hour < 21) {
    return 'Masa al-khayr'; // Good evening
  } else {
    return 'Sabah al-layl'; // Good night
  }
}

function getMoonPhaseEmoji(): string {
  // Simple moon phase calculation based on date
  const now = new Date();
  const dayOfMonth = now.getDate();

  // Approximate moon phases (simplified)
  if (dayOfMonth >= 1 && dayOfMonth <= 3) return '🌑'; // New moon
  if (dayOfMonth >= 4 && dayOfMonth <= 7) return '🌒'; // Waxing crescent
  if (dayOfMonth >= 8 && dayOfMonth <= 10) return '🌓'; // First quarter
  if (dayOfMonth >= 11 && dayOfMonth <= 14) return '🌔'; // Waxing gibbous
  if (dayOfMonth >= 15 && dayOfMonth <= 17) return '🌕'; // Full moon
  if (dayOfMonth >= 18 && dayOfMonth <= 21) return '🌖'; // Waning gibbous
  if (dayOfMonth >= 22 && dayOfMonth <= 25) return '🌗'; // Last quarter
  return '🌘'; // Waning crescent
}

function getDaysToRamadan(): number {
  const today = moment();
  const currentHijriYear = today.iYear();

  // Ramadan starts on 1st of Ramadan (month 9)
  let ramadanStart = moment().iYear(currentHijriYear).iMonth(8).iDate(1); // month 8 = Ramadan (0-indexed)

  // If Ramadan has passed this year, get next year's Ramadan
  if (ramadanStart.isBefore(today)) {
    ramadanStart = moment()
      .iYear(currentHijriYear + 1)
      .iMonth(8)
      .iDate(1);
  }

  return ramadanStart.diff(today, 'days');
}

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
    const now = new Date();

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
    paddingTop: LAYOUT.SPACING.MEDIUM, // Minimal top spacing after header
    paddingBottom: LAYOUT.SPACING.XXLARGE, // Strong bottom separation from content sections
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
