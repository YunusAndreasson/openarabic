import { Ionicons } from '@/components/ui';
import { Link } from 'expo-router';
import type { FC } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BaseCard } from '@/components/common';
import { NotificationPrimingCard } from '@/components/review/NotificationPrimingCard';
import { VoicePrimingCard } from '@/components/review/VoicePrimingCard';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';

import { FONTS } from '@/constants/fonts';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
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
import { mixColors } from '@/utils/colorUtils';
import { successFeedback } from '@/utils/haptics';
import { createMargin, createPadding, COMMON_STYLES } from '@/utils/layoutUtils';

/** How much of a metric's hue is mixed into the card behind its icon. */
const METRIC_ICON_TINT = 0.12;

// Layout animation builders hoisted to module level per Reanimated best practices
// Success haptic fires from the checkmark's completion callback so it lands on the
// exact frame the zoom-in settles (no estimated setTimeout offset).
const ENTERING_ICON = ZoomIn.duration(TIMING_CONFIG.FAST.duration)
  .springify()
  .withCallback(finished => {
    'worklet';
    if (finished) {
      scheduleOnRN(successFeedback);
    }
  });
const ENTERING_TITLE = FadeInUp.delay(TIMING_CONSTANTS.STAGGER.BASE).duration(
  TIMING_CONFIG.FAST.duration,
);
const ENTERING_EDUCATIONAL = FadeInUp.delay(TIMING_CONSTANTS.STAGGER.MEDIUM).duration(
  TIMING_CONFIG.FAST.duration,
);
const ENTERING_BUTTON_WITH_METRICS = FadeIn.delay(
  TIMING_CONSTANTS.STAGGER.BUTTON_WITH_METRICS,
).duration(TIMING_CONFIG.FAST.duration);
const ENTERING_BUTTON_WITHOUT_METRICS = FadeIn.delay(
  TIMING_CONSTANTS.STAGGER.BUTTON_WITHOUT_METRICS,
).duration(TIMING_CONFIG.FAST.duration);
// Pre-build metric entering animations for indices 0-4 (typical max metrics count)
const ENTERING_METRICS = Array.from({ length: 5 }, (_, index) =>
  FadeInUp.delay(
    TIMING_CONSTANTS.STAGGER.SLOW + index * TIMING_CONSTANTS.STAGGER.INCREMENT,
  ).duration(TIMING_CONFIG.FAST.duration),
);
// Priming card lands after the metric stagger (metrics are capped at 2 when it shows)
const ENTERING_PRIMING = FadeInUp.delay(
  TIMING_CONSTANTS.STAGGER.SLOW + 3 * TIMING_CONSTANTS.STAGGER.INCREMENT,
).duration(TIMING_CONFIG.FAST.duration);
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

export const CompletionScreen: FC<CompletionScreenProps> = ({
  title = STRINGS.SESSION_COMPLETE,
  iconSize = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE,
  contentStyle,
  sessionMetrics,
  testID,
  fromRemember = false,
  onContinue,
}) => {
  const colors = useColors();

  // Fetch current daily study streak
  const { streak } = useStudyStreak();
  const currentDailyStreak = streak?.currentStreak ?? 0;

  // Handle review completion logic (query invalidation, analytics, haptics)
  useReviewCompletion(sessionMetrics);

  const encouragingResult = useEncouragingMetrics(sessionMetrics, colors, currentDailyStreak);

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

  const metrics = encouragingResult?.metrics ?? [];
  const visibleMetrics = showAnyPriming ? metrics.slice(0, MAX_METRICS_WITH_PRIMING) : metrics;

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View entering={ENTERING_ICON} style={styles.iconContainer}>
        <Ionicons color={colors.completionSuccess} name="checkmark-circle" size={iconSize} />
      </Animated.View>

      {/* Title Group - Closely grouped for Gestalt proximity */}
      <View style={styles.titleGroup}>
        <Animated.View entering={ENTERING_TITLE}>
          <ThemedText colorName="headingText" style={styles.titleText} type="heading1">
            {title}
          </ThemedText>
        </Animated.View>

        {/* Educational text - contextual based on session performance */}
        <Animated.View entering={ENTERING_EDUCATIONAL}>
          <ThemedText colorName="secondary" style={styles.educationalText} type="body">
            {encouragingResult?.educationalText ?? STRINGS.SESSION_ED_DEFAULT_POOL[0]}
          </ThemedText>
        </Animated.View>
      </View>

      {/* Metrics Section - Separated group for visual hierarchy */}
      {visibleMetrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {visibleMetrics.map((metric, index) => (
            <Animated.View key={metric.type + metric.text} entering={ENTERING_METRICS[index]}>
              <BaseCard
                contentStyle={styles.metricContent}
                elevation="hairline"
                style={styles.metricItem}
              >
                <View
                  style={[
                    styles.metricIconContainer,
                    // Mixed into the card rather than laid over it: a hue at 12%
                    // alpha composites against the near-black review background
                    // in dark mode and collapses to a grey smudge.
                    { backgroundColor: mixColors(colors.card, metric.color, METRIC_ICON_TINT) },
                  ]}
                >
                  <Ionicons
                    color={metric.color}
                    name={metric.icon}
                    size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  />
                </View>
                <View style={styles.metricTextContainer}>
                  <ThemedText style={styles.metricText} type="body">
                    {metric.text}
                  </ThemedText>
                </View>
              </BaseCard>
            </Animated.View>
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
      <Animated.View
        entering={
          encouragingResult ? ENTERING_BUTTON_WITH_METRICS : ENTERING_BUTTON_WITHOUT_METRICS
        }
        style={styles.buttonContainer}
      >
        {/* `onContinue` (useReview's handleClose) stops audio, settles pending
            grade writes, invalidates the FSRS queries and then navigates — the
            same path the close button takes. The Link fallbacks only apply when
            no handler is supplied.

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
      </Animated.View>
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

  // Title group - tightly grouped for Gestalt proximity
  titleGroup: {
    alignItems: 'center',
    width: '100%',
    marginBottom: LAYOUT.SPACING.XXXLARGE, // Large gap before metrics
  },

  titleText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },

  educationalText: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    textAlign: 'center',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.LOOSE,
  },

  // Metrics section - separated from title group
  metricsContainer: {
    gap: LAYOUT.SPACING.SMALL,
    width: '100%',
  },

  // BaseCard supplies the radius and the surface; this is only its padding.
  metricItem: {
    ...createPadding({ horizontal: 'LARGE', vertical: 'TINY' }),
  },

  metricContent: {
    ...COMMON_STYLES.row,
    ...createPadding({ vertical: 'TINY' }),
  },

  metricIconContainer: {
    ...COMMON_STYLES.centeredRow,
    ...COMMON_STYLES.roundedMedium,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM,
    ...createMargin({ right: 'MEDIUM' }),
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM,
  },

  metricTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  metricText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontFamily: FONTS.ENGLISH_SEMIBOLD,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.NORMAL,
    textAlign: 'left',
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
