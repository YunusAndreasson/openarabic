import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import moment from 'moment-hijri';
import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

interface IslamicEvent {
  name: string;
  arabicName: string;
  month: number;
  day: number;
}

// Core Islamic events
const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: '🌑 Muharram', arabicName: 'محرم', month: 1, day: 1 },
  { name: '🕌 Ashura', arabicName: 'عاشوراء', month: 1, day: 10 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 1, day: 13 },
  { name: '🌑 Safar', arabicName: 'صفر', month: 2, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 2, day: 13 },
  { name: "🌑 Rabi' al-Awwal", arabicName: 'ربيع الأول', month: 3, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 3, day: 13 },
  { name: "🌑 Rabi' al-Thani", arabicName: 'ربيع الثاني', month: 4, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 4, day: 13 },
  { name: '🌑 Jumada al-Awwal', arabicName: 'جمادى الأولى', month: 5, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 5, day: 13 },
  { name: '🌑 Jumada al-Thani', arabicName: 'جمادى الثانية', month: 6, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 6, day: 13 },
  { name: '🕌 Rajab', arabicName: 'رجب', month: 7, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 7, day: 13 },
  { name: "🌑 Sha'ban", arabicName: 'شعبان', month: 8, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 8, day: 13 },
  { name: '🌑 Ramadan', arabicName: 'رمضان', month: 9, day: 1 },
  { name: '🌟 Last 10 Days', arabicName: 'العشر الأواخر', month: 9, day: 21 },
  { name: '✨ Laylatul Qadr', arabicName: 'ليلة القدر', month: 9, day: 27 },
  { name: '🌑 Shawwal', arabicName: 'شوال', month: 10, day: 1 },
  { name: '🎉 Eid al-Fitr', arabicName: 'عيد الفطر', month: 10, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 10, day: 13 },
  { name: "🕌 Dhu al-Qi'dah", arabicName: 'ذو القعدة', month: 11, day: 1 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 11, day: 13 },
  { name: '🕌 Dhul Hijjah', arabicName: 'ذو الحجة', month: 12, day: 1 },
  { name: '🌟 First 10 Days', arabicName: 'العشر الأوائل', month: 12, day: 1 },
  { name: '⛰️ Day of Arafah', arabicName: 'يوم عرفة', month: 12, day: 9 },
  { name: '🎉 Eid al-Adha', arabicName: 'عيد الأضحى', month: 12, day: 10 },
  { name: '🌕 White Days', arabicName: 'الأيام البيض', month: 12, day: 13 },
];

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

interface EventWithDate extends IslamicEvent {
  hijriDate: string;
  gregorianDate: Date;
  daysFromNow: number;
}

function calculateUpcomingEvents(): EventWithDate[] {
  const events: EventWithDate[] = [];
  const currentHijriYear = moment().iYear();

  // Calculate for current year and next year
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const targetYear = currentHijriYear + yearOffset;

    ISLAMIC_EVENTS.forEach(event => {
      const hijriMoment = moment()
        .iYear(targetYear)
        .iMonth(event.month - 1)
        .iDate(event.day);
      const gregorianDate = hijriMoment.toDate();
      const daysFromNow = Math.ceil((gregorianDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysFromNow >= 0) {
        events.push({
          ...event,
          hijriDate: `${event.day} ${HIJRI_MONTHS[event.month - 1]} ${targetYear} AH`,
          gregorianDate,
          daysFromNow,
        });
      }
    });
  }

  return events.sort((a, b) => a.daysFromNow - b.daysFromNow).slice(0, 20);
}

const formatDaysUntil = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days} days`;
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
  if (days <= 365) return `In ${Math.ceil(days / 30)} months`;
  return `In ${Math.ceil(days / 365)} years`;
};

export default function IslamicCalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const events = useMemo(calculateUpcomingEvents, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Islamic Calendar',
          headerTitleStyle: {
            fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 1,
            fontWeight: '700',
            color: colors.text,
          },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Texts',
          headerBackTitleStyle: { fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM },
        }}
      />

      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
            },
          ]}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.eventsSection}>
            {events.map(event => {
              const isUpcoming = event.daysFromNow <= 7;
              return (
                <BaseCard
                  key={`${event.name}-${event.hijriDate}`}
                  style={styles.eventCard}
                  shadowSize="small"
                >
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventTitleContainer}>
                        <ThemedText type="bodyBold" style={styles.eventTitle}>
                          {event.name}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          weight="medium"
                          style={[
                            styles.daysUntil,
                            { color: isUpcoming ? colors.tint : colors.textTertiary },
                          ]}
                          skipDefaultColor
                        >
                          {formatDaysUntil(event.daysFromNow)}
                        </ThemedText>
                      </View>

                      <View style={[styles.separator, { backgroundColor: colors.border }]} />

                      <View style={styles.eventRightSection}>
                        <ThemedText
                          type="body"
                          style={[
                            styles.eventArabicName,
                            { fontFamily: 'Madina', color: colors.text },
                          ]}
                          skipDefaultColor
                        >
                          {event.arabicName}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.eventDates}>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar" size={12} color={colors.textTertiary} />
                        <ThemedText
                          type="caption"
                          style={[styles.dateText, { color: colors.textTertiary }]}
                          skipDefaultColor
                        >
                          {event.hijriDate}
                        </ThemedText>
                      </View>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                        <ThemedText type="caption" variant="secondary" style={styles.dateText}>
                          {event.gregorianDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </BaseCard>
              );
            })}
          </View>

          <BaseCard style={styles.noteCard} shadowSize="none">
            <View style={styles.noteContent}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
              <ThemedText type="caption" variant="secondary" style={styles.noteText}>
                Dates may vary by 1-2 days depending on moon sighting.
              </ThemedText>
            </View>
          </BaseCard>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  eventsSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  eventCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  eventContent: {
    padding: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.XTINY,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.XTINY,
  },
  eventTitleContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM + LAYOUT.SPACING.XTINY,
    justifyContent: 'flex-start',
  },
  eventTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
    fontWeight: '700',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 1,
    letterSpacing: -0.2,
  },
  separator: {
    width: 1,
    backgroundColor: 'transparent',
    marginHorizontal: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.XTINY,
    opacity: 0.2,
  },
  eventRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 130,
    maxWidth: 150,
    paddingVertical: LAYOUT.SPACING.XTINY / 2,
    paddingLeft: LAYOUT.SPACING.XTINY,
  },
  eventArabicName: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.7,
    textAlign: 'right',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: LAYOUT.SPACING.XTINY,
    letterSpacing: 0.3,
  },
  daysUntil: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  eventDates: {
    gap: LAYOUT.SPACING.XTINY,
    paddingTop: LAYOUT.SPACING.XTINY / 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.XTINY + 1,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.1,
  },
  noteCard: {
    backgroundColor: 'transparent',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  noteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: LAYOUT.SPACING.SMALL,
    gap: LAYOUT.SPACING.XTINY,
  },
  noteText: {
    flex: 1,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.4,
    fontStyle: 'italic',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
  },
});
