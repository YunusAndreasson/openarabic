import { Icon } from '@/components/ui';
import { Link } from 'expo-router';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { NotificationPrimingCard } from '@/components/review/NotificationPrimingCard';
import { VoicePrimingCard } from '@/components/review/VoicePrimingCard';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { checkPopEntering, TIMING_CONFIG } from '@/constants/animation';

import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import {
  useEncouragingMetrics,
  useNotificationPriming,
  useReviewCompletion,
  useVoicePriming,
} from '@/hooks/review';
import { useStudyStreak } from '@/hooks/practice';
import { useColors } from '@/hooks/theme/useColors';
import type { SessionMetrics } from '@/types/review.types';
import { successFeedback } from '@/utils/haptics';

// Layout animation builders hoisted to module level per Reanimated best practices
// Success haptic fires from the checkmark's completion callback so it lands on the
// exact frame the zoom-in settles (no estimated setTimeout offset). The pop
// itself, and why its duration goes into springify, is `checkPopEntering`.
const ENTERING_ICON = checkPopEntering().withCallback(finished => {
  'worklet';
  if (finished) {
    scheduleOnRN(successFeedback);
  }
});
// Nothing else on this screen animates in. The title, the rows and the button
// used to arrive in a staggered cascade (seven delays, up to 320ms) — motion
// performing a celebration rather than telling the learner anything. The
// checkmark keeps its pop because it carries the session's one success haptic.
//
// The priming card keeps a plain fade: its eligibility is an async read, so it
// can arrive after the rest of the screen, and a card that pops in unannounced
// reads as a layout jump.
const ENTERING_PRIMING = FadeIn.duration(TIMING_CONFIG.FAST.duration);
const EXITING_PRIMING = FadeOut.duration(TIMING_CONFIG.FAST.duration);
// Small screens: cap metric rows while the priming card is visible so the
// Continue button never gets crowded off.
const MAX_METRICS_WITH_PRIMING = 2;

interface CompletionScreenProps {
  title?: string;
  iconSize?: number;
  contentStyle?: ViewStyle;
  sessionMetrics?: SessionMetrics;
  testID?: string;
  fromRemember?: boolean; // For dismissTo navigation
  /**
   * Leave the session. REQUIRED for the counts on the practice tab to update:
   * this button used to be a bare `<Link>`, so finishing a session navigated
   * away without flushing the last grade's write or invalidating the FSRS
   * queries — and with `refetchOnMount: false` the tab kept showing pre-session
   * numbers indefinitely. Closing mid-session invalidated correctly, so
   * completing one properly was the only path that went stale.
   */
  onContinue?: () => void;
}

export const CompletionScreen = ({
  title = STRINGS.SESSION_COMPLETE,
  iconSize = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE,
  contentStyle,
  sessionMetrics,
  testID,
  fromRemember = false,
  onContinue,
}: CompletionScreenProps) => {
  const colors = useColors();

  // Fetch current daily study streak
  const { streak } = useStudyStreak();
  const currentDailyStreak = streak?.currentStreak ?? 0;

  // Completion side effects: analytics and the learner's local ledgers. Not
  // the query refresh — useReview's finalizeSession runs that as this screen
  // appears — and not the success haptic, which is the checkmark's below.
  useReviewCompletion(sessionMetrics);

  const sessionRows = useEncouragingMetrics(sessionMetrics, currentDailyStreak);

  // Primed notification ask — stands aside for the voice offer on a learner's
  // first completions, then shows once, and at most once more after a gap.
  const { showPrimingCard, resolved, accept, decline } = useNotificationPriming();
  // Speak-the-answer offer — stands on every completion until answered. Told
  // whether it actually gets the slot so it reports impressions honestly.
  const {
    showPrimingCard: showVoiceCard,
    accept: acceptVoice,
    decline: declineVoice,
  } = useVoicePriming('completion', resolved && !showPrimingCard);

  // The two share one slot, so only one may ever render, and on a collision the
  // notification ask still wins: it is capped at two impressions for the life of
  // the install, while the voice offer stands until answered and loses nothing
  // by waiting.
  //
  // Voice reaches a learner's early completions because VOICE_FIRST_SESSION_GRACE
  // in useNotificationPriming holds this ask back, not because of anything here.
  // Deciding it there is what keeps an impression from being spent on a card that
  // never rendered.
  //
  // `resolved` is load-bearing, not defensive: notification eligibility is an
  // async read, so without it `showPrimingCard` reads false on the first commits
  // and the voice card both renders and reports an impression in a slot the
  // reminders card is about to claim.
  //
  // The hook folds the `rendered` argument into the flag it returns, so
  // `showVoiceCard` is already the whole condition — nothing here re-tests
  // `showPrimingCard`, because priority encoded twice is priority that can
  // disagree with itself.
  const showAnyPriming = showPrimingCard || showVoiceCard;

  const metrics = sessionRows ?? [];
  const visibleMetrics = showAnyPriming ? metrics.slice(0, MAX_METRICS_WITH_PRIMING) : metrics;

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View entering={ENTERING_ICON} style={styles.iconContainer}>
        <Icon color={colors.completionSuccess} name="checkmark-circle" size={iconSize} />
      </Animated.View>

      <ThemedText colorName="headingText" style={styles.titleText} type="heading1">
        {title}
      </ThemedText>

      {/* What the session measured, one plain line each, in one ink. These
          used to be cards with an icon in a tinted square, each in its own hue
          (tint, info, warning, success) with a trophy and a flame, under a
          rotating paragraph of encouragement whose claims were not computed. */}
      {visibleMetrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {visibleMetrics.map(metric => (
            <ThemedText key={metric.type} type="body" style={styles.metricText}>
              {metric.text}
            </ThemedText>
          ))}
        </View>
      )}

      {/* Priming slot - between metrics and the bottom-anchored button. One
          card at most; see showVoiceCard above for which wins. */}
      {showAnyPriming && (
        <Animated.View
          entering={ENTERING_PRIMING}
          exiting={EXITING_PRIMING}
          style={styles.primingContainer}
        >
          {showVoiceCard ? (
            <VoicePrimingCard onAccept={acceptVoice} onDecline={declineVoice} />
          ) : (
            <NotificationPrimingCard onAccept={() => void accept()} onDecline={decline} />
          )}
        </Animated.View>
      )}

      {/* Spacer to push button to bottom */}
      <View style={styles.spacer} />

      {/* Action Button - Anchored to bottom */}
      <View style={styles.buttonContainer}>
        {/* `onContinue` (useReview's handleClose) stops audio and navigates —
            the same path the close button takes. The session's writes were
            already settled and the FSRS queries refreshed when this screen
            appeared (finalizeSession), so Continue has nothing left to wait
            on. The Link fallbacks only apply when no handler is supplied.

            hapticType="selection" overrides ThemedButton's 'light' default —
            tier 0 in utils/haptics. The success notification has already fired
            from the checkmark's landing callback, which is the moment worth
            marking; a Light tap on top of it two seconds later is a second,
            weaker claim about the same thing. */}
        {onContinue ? (
          <ThemedButton
            title={STRINGS.CONTINUE}
            hapticType="selection"
            onPress={onContinue}
            fullWidth
          />
        ) : fromRemember ? (
          <Link href={ROUTE_PATHS.PRACTICE_TAB} dismissTo={true} asChild>
            <ThemedButton fullWidth title={STRINGS.CONTINUE} hapticType="selection" />
          </Link>
        ) : (
          <Link href=".." replace asChild>
            <ThemedButton fullWidth title={STRINGS.CONTINUE} hapticType="selection" />
          </Link>
        )}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.elevation0,
        },
      ]}
      testID={testID}
    >
      {Content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: LAYOUT.REVIEW.COMPLETION.CONTENT_MAX_WIDTH,
    width: '100%',
    paddingTop: LAYOUT.SPACING.XXXLARGE,
  },

  iconContainer: {
    alignItems: 'center',
    height: LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE + LAYOUT.SPACING.LARGE,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },

  titleText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },

  metricsContainer: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    width: '100%',
  },

  metricText: {
    textAlign: 'center',
  },

  // Priming card sits below the metrics, above the flexible spacer
  primingContainer: {
    width: '100%',
    marginTop: LAYOUT.SPACING.LARGE,
  },

  // Spacer to push button to bottom
  spacer: {
    flex: 1,
  },

  // Button anchored to bottom
  buttonContainer: {
    width: '100%',
    paddingBottom: LAYOUT.SPACING.LARGE, // Extra padding at bottom
    gap: LAYOUT.SPACING.SMALL, // Between "Review N more" and Continue
  },
});
