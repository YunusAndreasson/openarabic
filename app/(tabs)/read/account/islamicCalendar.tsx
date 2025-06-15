import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT, FONTS } from '@/constants/layout';
import { createNavigationOptions } from '@/constants/modal';
import { useIslamicCalendarEvents, formatDaysUntil } from '@/hooks';
import { useColors } from '@/hooks/theme/useColors';

export default function IslamicCalendarScreen(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, currentHijriDate } = useIslamicCalendarEvents();

  const activeCount = events.filter(e => e.isActive).length;

  return (
    <>
      <Stack.Screen
        options={createNavigationOptions(colors, {
          title: 'Calendar',
          isRegularScreen: true,
        })}
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
                    { backgroundColor: colors.elevation1 },
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
                              ? `Day ${Math.floor((event.progress ?? 0) * (event.duration ?? 1))} of ${event.duration}`
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
                            { fontFamily: FONTS.ARABIC, color: colors.arabicText },
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
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
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
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: 2,
    overflow: 'hidden',
  },
  progressContainer: {
    marginTop: LAYOUT.SPACING.TINY / 2,
  },
  progressFill: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
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
