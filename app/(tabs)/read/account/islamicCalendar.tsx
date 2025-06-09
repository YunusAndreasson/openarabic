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
import { HIJRI_MONTHS } from '@/constants/hijri';
import { useColors } from '@/hooks/theme/useColors';

interface IslamicEvent {
  name: string;
  arabicName: string;
  month: number;
  day: number;
  duration?: number; // For multi-day events
}

// Core Islamic events
const ISLAMIC_EVENTS: IslamicEvent[] = [
  { name: 'Muharram', arabicName: 'محرم', month: 1, day: 1 },
  { name: 'Ashura', arabicName: 'عاشوراء', month: 1, day: 10 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 1, day: 13, duration: 3 },
  { name: 'Safar', arabicName: 'صفر', month: 2, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 2, day: 13, duration: 3 },
  { name: "Rabi' al-Awwal", arabicName: 'ربيع الأول', month: 3, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 3, day: 13, duration: 3 },
  { name: "Rabi' al-Thani", arabicName: 'ربيع الثاني', month: 4, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 4, day: 13, duration: 3 },
  { name: 'Jumada al-Awwal', arabicName: 'جمادى الأولى', month: 5, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 5, day: 13, duration: 3 },
  { name: 'Jumada al-Thani', arabicName: 'جمادى الثانية', month: 6, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 6, day: 13, duration: 3 },
  { name: 'Rajab', arabicName: 'رجب', month: 7, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 7, day: 13, duration: 3 },
  { name: "Sha'ban", arabicName: 'شعبان', month: 8, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 8, day: 13, duration: 3 },
  { name: 'Ramadan', arabicName: 'رمضان', month: 9, day: 1, duration: 30 },
  { name: 'Last 10 Days', arabicName: 'العشر الأواخر', month: 9, day: 21, duration: 10 },
  { name: 'Laylatul Qadr', arabicName: 'ليلة القدر', month: 9, day: 27 },
  { name: 'Shawwal', arabicName: 'شوال', month: 10, day: 1 },
  { name: 'Eid al-Fitr', arabicName: 'عيد الفطر', month: 10, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 10, day: 13, duration: 3 },
  { name: "Dhu al-Qi'dah", arabicName: 'ذو القعدة', month: 11, day: 1 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 11, day: 13, duration: 3 },
  { name: 'Dhul Hijjah', arabicName: 'ذو الحجة', month: 12, day: 1 },
  { name: 'First 10 Days', arabicName: 'العشر الأوائل', month: 12, day: 1, duration: 10 },
  { name: 'Day of Arafah', arabicName: 'يوم عرفة', month: 12, day: 9 },
  { name: 'Eid al-Adha', arabicName: 'عيد الأضحى', month: 12, day: 10 },
  { name: 'White Days', arabicName: 'الأيام البيض', month: 12, day: 13, duration: 3 },
];

interface EventWithDate extends IslamicEvent {
  hijriDate: string;
  gregorianDate: Date;
  daysFromNow: number;
  isActive?: boolean;
  progress?: number;
}

function getCurrentHijriDate() {
  const now = moment();
  const hijriDay = now.iDate();
  const hijriMonth = HIJRI_MONTHS[now.iMonth()];
  const hijriYear = now.iYear();
  return `${hijriDay} ${hijriMonth} ${hijriYear} AH`;
}

function calculateUpcomingEvents(): EventWithDate[] {
  const events: EventWithDate[] = [];
  const currentHijriYear = moment().iYear();

  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    const targetYear = currentHijriYear + yearOffset;

    ISLAMIC_EVENTS.forEach(event => {
      const hijriMoment = moment()
        .iYear(targetYear)
        .iMonth(event.month - 1)
        .iDate(event.day);
      const gregorianDate = hijriMoment.toDate();
      const daysFromNow = Math.ceil((gregorianDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (daysFromNow >= -30) {
        // Show events from 30 days ago to future
        let isActive = false;
        let progress = 0;

        // Check if event is currently active (for multi-day events)
        if (event.duration && daysFromNow <= 0) {
          const daysSinceStart = Math.abs(daysFromNow);
          if (daysSinceStart < event.duration) {
            isActive = true;
            progress = (daysSinceStart + 1) / event.duration;
          }
        }

        events.push({
          ...event,
          hijriDate: `${event.day} ${HIJRI_MONTHS[event.month - 1]} ${targetYear} AH`,
          gregorianDate,
          daysFromNow,
          isActive,
          progress,
        });
      }
    });
  }

  return events.sort((a, b) => a.daysFromNow - b.daysFromNow).slice(0, 25);
}

const formatDaysUntil = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) {
    const daysPast = Math.abs(days);
    if (daysPast === 1) return 'Yesterday';
    if (daysPast <= 7) return `${daysPast} days ago`;
    return 'Past';
  }
  if (days <= 7) return `In ${days} days`;
  if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
  if (days <= 365) return `In ${Math.ceil(days / 30)} months`;
  return `In ${Math.ceil(days / 365)} years`;
};

export default function IslamicCalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const events = useMemo(calculateUpcomingEvents, []);
  const currentHijriDate = useMemo(getCurrentHijriDate, []);

  const activeCount = events.filter(e => e.isActive).length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Calendar',
          headerTitleStyle: {
            ...LAYOUT.HEADER.TITLE.SECONDARY,
            color: colors.text,
          } as any,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Read',
          headerBackTitleStyle: { fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM },
        }}
      />

      <ThemedView
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        style={styles.container}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
            },
          ]}
        >
          {/* Current Date & Stats */}
          <BaseCard
            shadowSize="small"
            style={[styles.headerCard, { backgroundColor: colors.elevation2 }]}
          >
            <View style={styles.headerContent}>
              <View style={styles.currentDateSection}>
                <View style={styles.dateInfo}>
                  <ThemedText
                    skipDefaultColor
                    style={[styles.currentDateText, { color: colors.primary }]}
                    type="bodyBold"
                  >
                    Today
                  </ThemedText>
                  <ThemedText
                    skipDefaultColor
                    style={[styles.hijriDateText, { color: colors.secondaryText }]}
                    type="body"
                    weight="medium"
                  >
                    {currentHijriDate}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.statsSection}>
                {activeCount > 0 && (
                  <View style={styles.statItem}>
                    <ThemedText
                      skipDefaultColor
                      style={[styles.statNumber, { color: colors.success }]}
                      type="bodyBold"
                    >
                      {activeCount}
                    </ThemedText>
                    <ThemedText
                      skipDefaultColor
                      style={[styles.statLabel, { color: colors.textTertiary }]}
                      type="caption"
                    >
                      active
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </BaseCard>

          {/* Events List */}
          <View style={styles.eventsSection}>
            {events.map(event => {
              const isUpcoming = event.daysFromNow > 0 && event.daysFromNow <= 7;
              const isPast = event.daysFromNow < 0;

              return (
                <BaseCard
                  key={`${event.name}-${event.hijriDate}`}
                  shadowSize="small"
                  style={[
                    styles.eventCard,
                    { backgroundColor: isPast ? colors.elevation1 : colors.card },
                    event.isActive && {
                      borderLeftWidth: 3,
                      borderLeftColor: colors.warning,
                      backgroundColor: colors.elevation2,
                    },
                    isPast && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventTitleContainer}>
                        <ThemedText style={styles.eventTitle} type="bodyBold">
                          {event.name}
                        </ThemedText>

                        <View style={styles.timingRow}>
                          <ThemedText
                            skipDefaultColor
                            type="caption"
                            weight="medium"
                            style={[
                              styles.daysUntil,
                              {
                                color: event.isActive
                                  ? colors.warning
                                  : isUpcoming
                                    ? colors.success
                                    : isPast
                                      ? colors.textTertiary
                                      : colors.interactiveSecondary,
                              },
                            ]}
                          >
                            {event.isActive
                              ? `Day ${Math.floor((event.progress || 0) * (event.duration || 1))} of ${event.duration}`
                              : formatDaysUntil(event.daysFromNow)}
                          </ThemedText>

                          {event.isActive && event.progress && (
                            <View style={styles.progressContainer}>
                              <View
                                style={[
                                  styles.progressBar,
                                  { backgroundColor: colors.progressBackground },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.progressFill,
                                    {
                                      backgroundColor: colors.warning,
                                      width: `${event.progress * 100}%`,
                                    },
                                  ]}
                                />
                              </View>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={[styles.separator, { backgroundColor: colors.border }]} />

                      <View style={styles.eventRightSection}>
                        <ThemedText
                          skipDefaultColor
                          type="body"
                          style={[
                            styles.eventArabicName,
                            { fontFamily: 'Madina', color: colors.arabicText },
                          ]}
                        >
                          {event.arabicName}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.eventDates}>
                      <View style={styles.dateRow}>
                        <Ionicons color={colors.interactiveSecondary} name="calendar" size={12} />
                        <ThemedText
                          skipDefaultColor
                          style={[styles.dateText, { color: colors.interactiveSecondary }]}
                          type="caption"
                        >
                          {event.hijriDate}
                        </ThemedText>
                      </View>
                      <View style={styles.dateRow}>
                        <Ionicons
                          color={colors.interactiveSecondary}
                          name="calendar-outline"
                          size={12}
                        />
                        <ThemedText style={styles.dateText} type="caption" variant="secondary">
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

          {/* Footer Note */}
          <View style={styles.noteContent}>
            <Ionicons
              color={colors.interactiveSecondary}
              name="information-circle-outline"
              size={16}
            />
            <ThemedText style={styles.noteText} type="caption" variant="secondary">
              Dates may vary by 1-2 days depending on moon sighting. Active events show current
              progress.
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  currentDateSection: {
    flex: 1,
  },
  currentDateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '700',
  },
  dateInfo: {
    gap: LAYOUT.SPACING.TINY,
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: 0.1,
  },
  daysUntil: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  eventArabicName: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    includeFontPadding: false,
    letterSpacing: 0.2,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6,
    paddingVertical: LAYOUT.SPACING.TINY,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  eventCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  eventContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  eventDates: {
    gap: LAYOUT.SPACING.TINY,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  eventHeader: {
    alignItems: 'stretch',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  eventRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: 150,
    minWidth: 130,
    paddingLeft: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY / 2,
  },
  eventTitle: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  eventTitleContainer: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  eventsSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  headerCard: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  headerContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  hijriDateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  noteContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    padding: LAYOUT.CARD.PADDING.MEDIUM,
  },
  noteText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontStyle: 'italic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.4,
  },
  progressBar: {
    borderRadius: 1,
    height: 2,
    overflow: 'hidden',
  },
  progressContainer: {
    marginTop: LAYOUT.SPACING.TINY / 2,
  },
  progressFill: {
    borderRadius: 1,
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  scrollView: {
    flex: 1,
  },
  separator: {
    backgroundColor: 'transparent',
    marginHorizontal: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.TINY,
    opacity: 0.2,
    width: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  statNumber: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statsSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.LARGE,
  },
  timingRow: {
    gap: LAYOUT.SPACING.TINY / 2,
  },
});
