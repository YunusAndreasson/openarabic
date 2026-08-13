import { Ionicons } from '@/components/ui';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard } from '@/components/common';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { ONBOARDING_CONFIG, OnboardingStep } from '@/constants/onboarding';
import { getArticleRoute, ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import type { OnboardingChecklistState } from '@/hooks/onboarding/useOnboardingChecklist';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import type { Article } from '@/types/articles.types';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import { pickStarterArticle } from '@/utils/articleUtils';
import { selectionFeedback } from '@/utils/haptics';

const CHECK_ICON_SIZE = 22;

// Mount fade-in — Reanimated 4 CSS @keyframes, module-level so no per-render
// alloc. Gives the card a deliberate entrance when the welcome intro dismisses,
// instead of popping in behind the closing modal.
const MOUNT_FADE_IN_STYLE = {
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${TIMING_CONFIG.SLOW.duration}ms`,
  animationFillMode: 'forwards' as const,
} as ReanimatedCSSAnimationStyle;

interface GetStartedChecklistProps {
  articlesData: Article[];
  /** Owned by the Explore screen so eligibility is evaluated exactly once */
  checklist: OnboardingChecklistState;
  /** Welcome intro is on screen — stay hidden until it's dismissed */
  isSuppressedByIntro?: boolean;
}

/**
 * "Get started" checklist shown at the top of Explore for new users.
 * Three rows track the hallmark actions (read a text, save a word, listen to
 * bilingual audio) with real completion state; tapping an undone row lands the
 * user in a starter article where all three actions live. Once everything is
 * done the card pauses, collapses away, and never returns.
 */
const GetStartedChecklistComponent: FC<GetStartedChecklistProps> = ({
  articlesData,
  checklist,
  isSuppressedByIntro = false,
}) => {
  const colors = useColors();
  const router = useRouter();
  const { isChecklistVisible, items, doneCount, allDone, finalizeCompletion } = checklist;

  const articleIds = useMemo(() => articlesData.map(a => a.id), [articlesData]);
  const { data: progressMap } = useBulkReadingProgress(articleIds);

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
      collapseProgress.value = withTiming(
        1,
        { duration: ONBOARDING_CONFIG.CHECKLIST_COLLAPSE_DURATION_MS },
        finished => {
          if (finished) {
            scheduleOnRN(finalizeCompletion);
          }
        },
      );
    }, ONBOARDING_CONFIG.CHECKLIST_COLLAPSE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [allDone, isChecklistVisible, collapseProgress, finalizeCompletion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (collapseProgress.value === 0 || measuredHeight === 0) {
      return { opacity: 1 - collapseProgress.value };
    }
    return {
      opacity: 1 - collapseProgress.value,
      height: measuredHeight * (1 - collapseProgress.value),
      overflow: 'hidden' as const,
    };
  }, [measuredHeight]);

  const handleRowPress = useCallback(
    (step: OnboardingStep) => {
      selectionFeedback();
      analytics.track(ANALYTICS_EVENTS.ONBOARDING_CHECKLIST_ITEM_TAPPED, { item: step });

      // Practice is the one step that doesn't happen inside an article. Send the
      // user to the tab rather than straight into a session — a first-run user
      // has probably never opened it, and the point is to show them their saved
      // words are waiting there.
      if (step === OnboardingStep.PRACTICE_WORD) {
        router.push(ROUTE_PATHS.PRACTICE_TAB);
        return;
      }

      const starter = pickStarterArticle(articlesData, progressMap);
      if (starter) {
        router.push(getArticleRoute(starter.id, starter.title, true));
      }
    },
    [articlesData, progressMap, router],
  );

  if (!isChecklistVisible || isSuppressedByIntro) {
    return null;
  }

  const progressLabel = STRINGS.CHECKLIST_PROGRESS.replace('{done}', String(doneCount)).replace(
    '{total}',
    String(items.length),
  );

  return (
    <Animated.View style={[MOUNT_FADE_IN_STYLE, animatedStyle]}>
      <View
        style={styles.cardWrapper}
        onLayout={event => setMeasuredHeight(event.nativeEvent.layout.height)}
      >
        <BaseCard contentStyle={styles.cardContent}>
          <View style={styles.headerRow}>
            <ThemedText type="bodyBold">{STRINGS.CHECKLIST_TITLE}</ThemedText>
            <ThemedText type="caption" colorName="secondaryText">
              {progressLabel}
            </ThemedText>
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
                <Animated.View entering={ZoomIn.springify()}>
                  <Ionicons name="checkmark-circle" size={CHECK_ICON_SIZE} color={colors.success} />
                </Animated.View>
              ) : (
                <Ionicons
                  name="ellipse-outline"
                  size={CHECK_ICON_SIZE}
                  color={colors.textTertiary}
                />
              )}
              <ThemedText
                colorName={item.done ? 'secondaryText' : 'text'}
                style={styles.rowLabel}
                type="body"
              >
                {item.label}
              </ThemedText>
              {!item.done && (
                <Ionicons
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.TINY,
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
