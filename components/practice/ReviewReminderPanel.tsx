import { useWidgetOffer } from '@/hooks/onboarding/useWidgetOffer';
import { openWidgetGuide } from '@/components/widget/WidgetOffer';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui/Icon';
import { ROUTE_PATHS } from '@/constants/routes';
import { getElevation } from '@/constants/elevation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useReviewReminder } from '@/hooks/onboarding/useReviewReminder';
import { useColors } from '@/hooks/theme/useColors';
import type { FirstReview } from '@/services/firstReview';
import { getDueWordReviewRoute } from '@/utils/routeBuilders';

const reminderCopy = STRINGS.REVIEW_REMINDER_COPY;
const time = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
function nextTime(stamp: number) {
  const when = new Date(stamp);
  const day =
    when.toDateString() === new Date().toDateString()
      ? STRINGS.STREAK_CHART_TODAY_LABEL
      : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return STRINGS.REMINDER_AROUND(day, time(when));
}

export function ReviewReminderPanel({
  owner,
  review,
  onContinue,
}: {
  owner: string;
  review?: FirstReview;
  onContinue?: () => void;
}) {
  const { state, next, pref, due, act, dismiss, settingsAction } = useReviewReminder(owner, review);
  const offer = useWidgetOffer(
    'receipt',
    review?.step === 'complete' && (state === 'offer' || state === 'hidden'),
  );
  const widget = offer.show ? (
    <ThemedButton
      variant="outlined"
      title={STRINGS.WIDGET_RECEIPT}
      onPress={() => openWidgetGuide('receipt')}
    />
  ) : null;
  const colors = useColors();
  const exit =
    onContinue ?? (state === 'recovery' ? () => router.push(ROUTE_PATHS.EXPLORE_TAB) : undefined);
  const reading = exit ? (
    <ThemedButton
      title={STRINGS.CONTINUE_READING}
      variant={state === 'off' || state === 'on' ? 'filled' : 'ghost'}
      onPress={exit}
    />
  ) : null;
  if (state === 'hidden' || (state === 'offer' && offer.widgetChosen))
    return (
      <>
        {widget}
        {reading}
      </>
    );
  const off = state === 'off' || state === 'recovery';
  const card = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
    getElevation(colors, 'CARD'),
  ];
  const preferredTime = new Date();
  preferredTime.setHours(pref.hour, pref.minute, 0, 0);
  return (
    <>
      {due?.root && state === 'recovery' && (
        <View style={card}>
          <ThemedText type="heading2">{STRINGS.ONE_WORD_DUE}</ThemedText>
          <ThemedText accessibilityLanguage="ar" type="arabic" align="right">
            {due.root.letters}
          </ThemedText>
          <ThemedButton
            title={STRINGS.REVIEW_THIS_WORD}
            onPress={() => router.push(getDueWordReviewRoute(due.root_id))}
          />
        </View>
      )}
      <View style={card} accessibilityLiveRegion="polite">
        <View style={styles.title}>
          {state === 'on' && (
            <Icon name="notifications" size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} color={colors.tint} />
          )}
          <ThemedText accessibilityRole="header" type="heading2">
            {state === 'on'
              ? STRINGS.REVIEW_REMINDERS_ON
              : off
                ? STRINGS.REVIEW_REMINDERS_OFF
                : STRINGS.STUDY_REMINDERS}
          </ThemedText>
        </View>
        {state === 'on' && next ? (
          <View style={[styles.next, { borderColor: colors.border }]}>
            <ThemedText colorName="secondaryText">{STRINGS.NEXT_REMINDER}</ThemedText>
            <ThemedText type="bodyBold">{nextTime(next)}</ThemedText>
          </View>
        ) : (
          <ThemedText colorName="secondaryText">
            {state === 'recovery' && settingsAction
              ? STRINGS.REMINDER_SETTINGS_COPY
              : state === 'off'
                ? STRINGS.REVIEW_REMINDERS_OFF_BODY
                : state === 'error'
                  ? STRINGS.REVIEW_REMINDERS_RETRY
                  : reminderCopy(time(preferredTime))}
          </ThemedText>
        )}
        {state !== 'on' && state !== 'off' && (
          <ThemedButton
            title={
              state === 'error'
                ? STRINGS.PLEASE_TRY_AGAIN
                : state === 'recovery' && settingsAction
                  ? STRINGS.OPEN_NOTIFICATION_SETTINGS
                  : STRINGS.SET_REVIEW_REMINDER
            }
            variant={state === 'recovery' && settingsAction ? 'outlined' : 'filled'}
            loading={state === 'busy'}
            disabled={state === 'busy'}
            onPress={() => void act()}
          />
        )}
        {state === 'recovery' && (
          <ThemedButton title={STRINGS.DISMISS_REMINDER} variant="ghost" onPress={dismiss} />
        )}
      </View>
      {widget}
      {reading}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    flexWrap: 'wrap',
  },
  next: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL,
    borderTopWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    padding: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
});
