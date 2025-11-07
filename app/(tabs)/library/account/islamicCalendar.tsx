import { BaseCard } from '@/components/common';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IslamicCalendarHeader } from '@/components/library';
import { FONTS, LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { formatDaysUntil, useIslamicCalendarEvents } from '@/hooks';
import { useColors } from '@/hooks/theme/useColors';

export default function IslamicCalendarScreen(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events } = useIslamicCalendarEvents();

  const activeCount = events.filter(e => e.isActive).length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ThemedView
        includeBottomInset={false}
        safeAreaEdges={[]} // Remove safe area edges to allow full-screen parallax
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
          {/* Parallax Header with integrated navigation - Full width */}
          <IslamicCalendarHeader activeEventsCount={activeCount} />

          {/* Content container with proper padding for the rest */}
          <View style={styles.contentContainer}>
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
                      isPast && { opacity: LAYOUT.OPACITY.HIGH },
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
                                ? STRINGS.DAY_OF_TEMPLATE.replace(
                                    '{day}',
                                    Math.floor(
                                      (event.progress ?? 0) * (event.duration ?? 1),
                                    ).toString(),
                                  ).replace('{duration}', String(event.duration))
                                : formatDaysUntil(event.daysFromNow)}
                            </ThemedText>

                            {event.isActive && event.progress && (
                              <View style={styles.progressContainer}>
                                <View
                                  style={[
                                    styles.progressBar,
                                    { backgroundColor: colors.elevation2 },
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
                          <Ionicons
                            color={colors.interactiveSecondary}
                            name="calendar"
                            size={LAYOUT.SPACING.MEDIUM}
                          />
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
                            name="calendar"
                            size={LAYOUT.SPACING.MEDIUM}
                          />
                          <ThemedText
                            style={styles.dateText}
                            type="caption"
                            colorName="metadataText"
                          >
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
                name="information-circle"
                size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              />
              <ThemedText style={styles.noteText} type="caption" colorName="metadataText">
                {STRINGS.DATE_VARIANCE_NOTE}
              </ThemedText>
            </View>
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
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    paddingTop: LAYOUT.SPACING.MEDIUM, // Add spacing after the full-width header
  },
  dateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.TINY,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.SLIGHT_POSITIVE,
  },
  daysUntil: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
  },
  eventArabicName: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    includeFontPadding: false,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.WIDE,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.6,
    paddingVertical: LAYOUT.SPACING.TINY,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  eventCard: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  eventContent: {
    padding: LAYOUT.SPACING.MEDIUM,
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
    maxWidth: LAYOUT.CALENDAR.EVENT_RIGHT_SECTION.MAX_WIDTH,
    minWidth: LAYOUT.CALENDAR.EVENT_RIGHT_SECTION.MIN_WIDTH,
    paddingLeft: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY / 2,
  },
  eventTitle: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
    letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.NARROW,
  },
  eventTitleContainer: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
    justifyContent: 'flex-start',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  eventsSection: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  noteContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  noteText: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontStyle: 'italic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.4,
  },
  progressBar: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.SPACING.MICRO * 2,
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
    paddingTop: 0, // Remove padding since parallax header handles its own layout
  },
  scrollView: {
    flex: 1,
  },
  separator: {
    backgroundColor: 'transparent',
    marginHorizontal: LAYOUT.SPACING.SMALL + LAYOUT.SPACING.TINY,
    opacity: LAYOUT.OPACITY.SUBTLE,
    width: LAYOUT.SPACING.MICRO,
  },
  timingRow: {
    gap: LAYOUT.SPACING.TINY,
  },
});
