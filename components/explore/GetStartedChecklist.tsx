import { GlyphButton, Icon } from '@/components/ui';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/primitives/ThemedText';
import { BaseCard } from '@/components/common';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG, fadeInStyle } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ONBOARDING_CONFIG, OnboardingStep } from '@/constants/onboarding';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import type { OnboardingChecklistState } from '@/hooks/onboarding/useOnboardingChecklist';
import { useOpenStarterArticle } from '@/hooks/onboarding/useOpenStarterArticle';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import type { Article } from '@/types/articles.types';
import { selectionFeedback } from '@/utils/haptics';
import { fillTemplate } from '@/utils/fillTemplate';

const CHECK_ICON_SIZE = 22;

// Mount fade-in — Reanimated 4 CSS @keyframes, module-level so no per-render
// alloc. Gives the card a deliberate entrance when the welcome intro dismisses,
// instead of popping in behind the closing modal.
const MOUNT_FADE_IN_STYLE = fadeInStyle(TIMING_CONFIG.SLOW.duration, 'forwards');

/** A small pop with no wobble — the ratio CompletionScreen's check uses. */
const CHECK_DAMPING_RATIO = 0.75;

// The duration goes INTO springify: a bare `.springify()` runs Reanimated's
// default physics spring for ~0.8s, a long wobble for a tick that should land
// while the learner is still looking at the row.
const ENTERING_CHECK = ZoomIn.springify(TIMING_CONFIG.FAST.duration).dampingRatio(
  CHECK_DAMPING_RATIO,
);

interface GetStartedChecklistProps {
  articlesData: Article[];
  /** Owned by the Explore screen so eligibility is evaluated exactly once */
  checklist: OnboardingChecklistState;
  /** Welcome intro is on screen — stay hidden until it's dismissed */
  isSuppressedByIntro?: boolean;
}

/**
 * "Get started" checklist shown at the top of Explore for new users.
 * Four rows track the hallmark actions (read a text, save a word, listen to
 * bilingual audio, practise a word) with real completion state; tapping an
 * undone row lands the user where that action lives. Once everything is done
 * the card pauses, collapses away, and never returns. The close glyph in its
 * header puts it away for good before then.
 */
const GetStartedChecklistComponent = ({
  articlesData,
  checklist,
  isSuppressedByIntro = false,
}: GetStartedChecklistProps) => {
  const colors = useColors();
  const router = useRouter();
  const { isChecklistVisible, items, doneCount, allDone, finalizeCompletion, dismiss } = checklist;

  const openStarterArticle = useOpenStarterArticle(articlesData);

  // Collapse animation: measured height + opacity → 0, then persist completion.
  // Height-based (not reanimated `exiting`) because the card lives inside a
  // FlashList ListHeaderComponent where exit animations are unreliable.
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const collapseProgress = useSharedValue(0);
  const wasAllDoneAtMountRef = useRef(allDone);
  const hasStartedCollapseRef = useRef(false);

  useEffect(() => {
    if (!allDone || !isChecklistVisible || hasStartedCollapseRef.current) return;
    hasStartedCollapseRef.current = true;

    // Completed off-screen (e.g. via playlist tab): hide without ceremony
    if (wasAllDoneAtMountRef.current) {
      finalizeCompletion();
      return;
    }

    const timeout = setTimeout(() => {
      collapseProgress.set(
        withTiming(1, { duration: ONBOARDING_CONFIG.CHECKLIST_COLLAPSE_DURATION_MS }, finished => {
          if (finished) {
            scheduleOnRN(finalizeCompletion);
          }
        }),
      );
    }, ONBOARDING_CONFIG.CHECKLIST_COLLAPSE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [allDone, isChecklistVisible, collapseProgress, finalizeCompletion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (collapseProgress.get() === 0 || measuredHeight === 0) {
      return { opacity: 1 - collapseProgress.get() };
    }
    return {
      opacity: 1 - collapseProgress.get(),
      height: measuredHeight * (1 - collapseProgress.get()),
      overflow: 'hidden' as const,
    };
  }, [measuredHeight]);

  const handleRowPress = useCallback(
    (step: OnboardingStep) => {
      selectionFeedback();
      void analytics.track(ANALYTICS_EVENTS.ONBOARDING_CHECKLIST_ITEM_TAPPED, { item: step });

      // Practice is the one step that doesn't happen inside an article. Send the
      // user to the tab rather than straight into a session — a first-run user
      // has probably never opened it, and the point is to show them their saved
      // words are waiting there.
      if (step === OnboardingStep.PRACTICE_WORD) {
        router.navigate(ROUTE_PATHS.PRACTICE_TAB);
        return;
      }

      openStarterArticle();
    },
    [openStarterArticle, router],
  );

  if (!isChecklistVisible || isSuppressedByIntro) {
    return null;
  }

  const progressLabel = fillTemplate(STRINGS.CHECKLIST_PROGRESS, {
    done: doneCount,
    total: items.length,
  });

  return (
    <Animated.View style={[MOUNT_FADE_IN_STYLE, animatedStyle]}>
      <View
        style={styles.cardWrapper}
        onLayout={event => setMeasuredHeight(event.nativeEvent.layout.height)}
      >
        <BaseCard contentStyle={styles.cardContent}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.title} type="bodyBold">
              {STRINGS.CHECKLIST_TITLE}
            </ThemedText>
            <ThemedText type="caption" colorName="secondaryText">
              {progressLabel}
            </ThemedText>
            {/* A bare glyph, not a filled button: putting the card away is the
                least important thing on it, and it should look it. */}
            <GlyphButton
              accessibilityLabel={STRINGS.CHECKLIST_DISMISS_A11Y}
              icon="close"
              onPress={dismiss}
            />
          </View>

          {items.map(item => (
            <Pressable
              key={item.step}
              style={styles.row}
              onPress={() => handleRowPress(item.step)}
              disabled={item.done}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ checked: item.done }}
            >
              {item.done ? (
                <Animated.View entering={ENTERING_CHECK}>
                  <Icon name="checkmark-circle" size={CHECK_ICON_SIZE} color={colors.success} />
                </Animated.View>
              ) : (
                <Icon name="ellipse-outline" size={CHECK_ICON_SIZE} color={colors.textTertiary} />
              )}
              <ThemedText
                colorName={item.done ? 'secondaryText' : 'text'}
                style={styles.rowLabel}
                type="body"
              >
                {item.label}
              </ThemedText>
              {!item.done && (
                <Icon
                  name="chevron-forward"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
                  color={colors.textTertiary}
                />
              )}
            </Pressable>
          ))}
        </BaseCard>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    // First content under the header — match the 12px lead-in all tabs share
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  cardContent: {
    // MEDIUM interior padding — the card norm across tab screens (CompactNavCard,
    // MetricCard)
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.TINY,
  },
  title: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.LARGE,
  },
  rowLabel: {
    flex: 1,
  },
});

export const GetStartedChecklist = memo(GetStartedChecklistComponent);
GetStartedChecklist.displayName = 'GetStartedChecklist';
