import { useQuery } from '@tanstack/react-query';
import { router, useIsFocused } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ReviewReminderPanel } from '@/components/practice/ReviewReminderPanel';
import { Icon } from '@/components/ui/Icon';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { getElevation } from '@/constants/elevation';
import { getArabicHeroTextStyle, LAYOUT } from '@/constants/layout';
import { fsrsQueries, PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import { MILLISECONDS_PER_DAY, timestampMs } from '@/utils/dateTimeUtils';
import { useColors } from '@/hooks/theme/useColors';
import { leaveFirstReview, resumeFirstReview, type FirstReview } from '@/services/firstReview';
import { selectArabicFontSize } from '@/store/settingsSlice';
import { useAppSelector } from '@/store/hooks';
import type { RootId } from '@/types/branded.types';
import { formatDueCount } from '@/utils/dueCountText';
import { getArticleRoute } from '@/utils/routeBuilders';

const reviewedCount = STRINGS.METRIC_WORDS_REVIEWED;

export function FirstReviewReceipt({
  owner,
  root,
  fallback,
}: {
  owner: string;
  root: RootId;
  fallback: ReactNode;
}) {
  const [review, setReview] = useState<FirstReview | null>();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const colors = useColors();
  const size = useAppSelector(selectArabicFontSize);
  const focused = useIsFocused();
  const complete = review?.step === 'complete';
  const schedule = useQuery({
    ...fsrsQueries.all(owner),
    enabled: focused && complete,
    staleTime: 0,
    select: words => words.find(word => word.root_id === root)?.fsrs_due ?? null,
  });
  const deadline = timestampMs(review?.due);
  const [now, setNow] = useState(Date.now);
  useResumeFromBackground(() => {
    setNow(Date.now());
    void schedule.refetch();
  }, focused && complete);
  useEffect(() => {
    if (!complete || !Number.isFinite(deadline) || deadline <= now) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(0, Math.min(deadline - Date.now(), MILLISECONDS_PER_DAY)),
    );
    return () => clearTimeout(timer);
  }, [complete, deadline, now]);
  const { data: due } = useQuery({
    ...fsrsQueries.due(owner, DEFAULT_SESSION_COOLDOWN_HOURS, PRACTICE_DUE_WORDS_LIMIT),
    enabled: review?.step === 'complete',
  });
  useEffect(() => {
    let active = true;
    void resumeFirstReview(owner, root)
      .then(value => {
        if (active) {
          setNow(Date.now());
          setReview(value ?? null);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [owner, root, retry]);
  const scheduleKnown = schedule.isSuccess && schedule.fetchStatus === 'idle';
  const retired =
    complete &&
    (!Number.isFinite(deadline) ||
      deadline <= now ||
      (scheduleKnown && timestampMs(schedule.data) !== deadline));
  useEffect(() => {
    if (!review || !retired) return;
    // Only this confirmed receipt is removed. A stale route or a cold start
    // must not reopen the first-session offers on a subsequent review.
    void leaveFirstReview(review)
      .then(() => setReview(current => (current?.id === review.id ? null : current)))
      .catch(() => undefined);
  }, [review, retired]);
  if (review === undefined && error)
    return <ThemedButton title={STRINGS.PLEASE_TRY_AGAIN} onPress={() => setRetry(n => n + 1)} />;
  if (review === undefined) return <ActivityIndicator color={colors.tint} />;
  if (retired || review?.step !== 'complete' || !review.due || !review.card) return <>{fallback}</>;
  const { word } = review;
  async function backToReader() {
    if (!review) return;
    try {
      await leaveFirstReview(review);
      setReview(null);
      router.dismissTo(
        word.source === 'article' && word.articleId
          ? getArticleRoute(word.articleId, { sentenceId: word.sentenceId })
          : ROUTE_PATHS.EXPLORE_TAB,
      );
    } catch {
      setError(true);
    }
  }
  const panel = [
    styles.panel,
    { backgroundColor: colors.card, borderColor: colors.border },
    getElevation(colors, 'CARD'),
  ];
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <View style={panel}>
        <View style={styles.row}>
          <Icon name="checkmark-circle" size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} color={colors.tint} />
          <ThemedText type="heading2" accessibilityRole="header" accessibilityLiveRegion="polite">
            {reviewedCount(1)}
          </ThemedText>
        </View>
        <ThemedText
          type="arabic"
          align="right"
          accessibilityLanguage="ar"
          style={getArabicHeroTextStyle(size * 1.65)}
        >
          {review.card.letters}
        </ThemedText>
        {scheduleKnown && (
          <View style={[styles.due, { borderColor: colors.border }]}>
            <ThemedText colorName="secondaryText">{STRINGS.WORD_STAT_NEXT_REVIEW}</ThemedText>
            <ThemedText type="bodyBold">
              {new Date(review.due).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </ThemedText>
          </View>
        )}
      </View>
      <ReviewReminderPanel owner={owner} review={review} onContinue={() => void backToReader()} />
      {error && <ThemedText accessibilityRole="alert">{STRINGS.PLEASE_TRY_AGAIN}</ThemedText>}
      {due && (
        <View style={[panel, styles.dueSummary]}>
          <View>
            <ThemedText type="label">{STRINGS.DUE_NOW_LABEL}</ThemedText>
            <ThemedText type="heading2">{formatDueCount(due.length)}</ThemedText>
          </View>
          {due.length === 0 && (
            <ThemedText colorName="secondaryText">{STRINGS.TODAY_ALL_CAUGHT_UP}</ThemedText>
          )}
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: LAYOUT.SPACING.LARGE, gap: LAYOUT.SPACING.MEDIUM },
  panel: {
    padding: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.SPACING.SMALL, flexWrap: 'wrap' },
  due: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
    borderTopWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  dueSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
});
