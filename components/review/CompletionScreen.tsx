import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Fragment, useEffect, useMemo, type ComponentProps, type FC } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import {
  COMPLETION_BUTTON_DELAY,
  COMPLETION_METRIC_BASE_DELAY,
  COMPLETION_METRIC_STAGGER,
  COMPLETION_SUBTITLE_DELAY,
  COMPLETION_TITLE_DELAY,
  TIMING_CONFIG,
} from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEncouragingMetrics } from '@/hooks/review/useEncouragingMetrics';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { UiAction } from '@/types/enums';
import type { SessionMetrics } from '@/types/review.types';
import { withOpacity } from '@/utils/colorUtils';
import { successFeedback } from '@/utils/haptics';
import { createMargin, createPadding } from '@/utils/layoutUtils';

interface CompletionScreenProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  iconName?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  useThemedView?: boolean;
  contentStyle?: object;
  sessionMetrics?: SessionMetrics;
  testID?: string;
  fromRemember?: boolean; // For dismissTo navigation
}

const CompletionScreen: FC<CompletionScreenProps> = ({
  title = STRINGS.SESSION_COMPLETE,
  subtitle,
  buttonText = UiAction.CONTINUE,
  iconName = 'checkmark-circle',
  iconSize = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE,
  useThemedView = false,
  contentStyle,
  sessionMetrics,
  testID,
  fromRemember = false,
}) => {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Only invalidate queries for review flow
  useEffect(() => {
    if (!useThemedView && user?.id) {
      // Defer query invalidation until after completion screen animation completes
      InteractionManager.runAfterInteractions(() => {
        // Invalidate all FSRS word queries to ensure coach messages and study tab update
        queryClient.invalidateQueries({
          predicate: query => {
            const key = query.queryKey[0];
            return key === 'fsrs-words' || key === 'struggling-words';
          },
        });

        // Specifically invalidate the queries used by the study tab for immediate updates
        if (user?.id) {
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.all(user.id) });
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
          queryClient.invalidateQueries({ queryKey: FSRS_QUERY_KEYS.stats(user.id) });
          queryClient.invalidateQueries({
            queryKey: FSRS_QUERY_KEYS.allWithCooldown(user.id, DEFAULT_SESSION_COOLDOWN_HOURS),
          });
        }
      });
    }
  }, [user?.id, queryClient, useThemedView]);

  // Trigger haptic feedback when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      successFeedback();
    }, TIMING_CONFIG.FAST.duration + TIMING_CONFIG.ENTRANCE.duration / 2);

    return () => clearTimeout(timer);
  }, []);

  const encouragingMetrics = useEncouragingMetrics(sessionMetrics, colors);

  // Memoize analytics data to prevent unnecessary recalculations
  const analyticsData = useMemo(() => {
    if (!sessionMetrics) return null;

    const sessionDuration = Date.now() - sessionMetrics.startTime;
    const wordsReviewed = sessionMetrics.wordsReviewed;

    // Only calculate performance metrics if there are words to review
    const performanceMetrics =
      wordsReviewed > 0
        ? {
            accuracyRate: Math.round((sessionMetrics.wordsKnown / wordsReviewed) * 100),
            struggleRate: Math.round((sessionMetrics.wordsVague / wordsReviewed) * 100),
            unknownRate: Math.round((sessionMetrics.wordsUnknown / wordsReviewed) * 100),
          }
        : { accuracyRate: 0, struggleRate: 0, unknownRate: 0 };

    return {
      // Core session data
      wordsReviewed,
      wordsKnown: sessionMetrics.wordsKnown,
      wordsVague: sessionMetrics.wordsVague,
      wordsUnknown: sessionMetrics.wordsUnknown,
      masteredWords: sessionMetrics.masteredWords,

      // Performance metrics
      ...performanceMetrics,

      // Learning progress
      averageStabilityIncrease: Math.round(sessionMetrics.averageStabilityIncrease * 100) / 100,
      longestStreak: sessionMetrics.longestStreak,
      currentStreak: sessionMetrics.currentStreak,

      // Session metadata
      sessionDurationMs: sessionDuration,
      sessionDurationMinutes: Math.round(sessionDuration / 60000), // Convert ms to minutes
      wordsPerMinute: wordsReviewed, // Simplified - just total words for now

      // Session quality indicators
      hadPerfectSession: sessionMetrics.wordsUnknown === 0 && sessionMetrics.wordsVague === 0,
      hadStruggleWords: sessionMetrics.wordsVague > 0,
      hadUnknownWords: sessionMetrics.wordsUnknown > 0,
      hadMasteredWords: sessionMetrics.masteredWords > 0,
    };
  }, [sessionMetrics, useThemedView]);

  // Track practice session completion analytics - runs only once when data is ready
  useEffect(() => {
    if (analyticsData) {
      analytics.track(ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE, analyticsData);
    }
  }, [analyticsData]);

  const Content = (
    <View style={[styles.contentContainer, contentStyle || {}]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View
        entering={ZoomIn.delay(TIMING_CONFIG.FAST.duration)
          .duration(TIMING_CONFIG.ENTRANCE.duration)
          .springify()}
        style={styles.iconContainer}
      >
        <Ionicons color={colors.completionSuccess} name={iconName} size={iconSize} />
      </Animated.View>

      {/* Text Content - Secondary hierarchy */}
      <View style={styles.textContainer}>
        <Animated.View
          entering={FadeInUp.delay(COMPLETION_TITLE_DELAY).duration(TIMING_CONFIG.GENTLE.duration)}
        >
          <ThemedText colorName="headingText" style={styles.titleText} type="heading2">
            {title}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(COMPLETION_SUBTITLE_DELAY).duration(
            TIMING_CONFIG.GENTLE.duration
          )}
        >
          <ThemedText colorName="subtitleText" style={styles.subtitleText} type="heading3">
            {subtitle}
          </ThemedText>
        </Animated.View>

        {/* Metrics Section - Tertiary hierarchy with proper grouping */}
        {encouragingMetrics && encouragingMetrics.length > 0 && (
          <View style={styles.metricsContainer}>
            {encouragingMetrics.map((metric, index) => (
              <Fragment key={metric.type + metric.text}>
                <Animated.View
                  entering={FadeInUp.delay(
                    COMPLETION_METRIC_BASE_DELAY + index * COMPLETION_METRIC_STAGGER
                  ).duration(TIMING_CONFIG.GENTLE.duration)}
                  style={[
                    styles.metricItem,
                    {
                      backgroundColor: withOpacity(colors.black, 0.02),
                      borderColor: withOpacity(colors.black, 0.05),
                    },
                  ]}
                >
                  <View style={styles.metricContent}>
                    <View
                      style={[styles.metricIconContainer, { backgroundColor: `${metric.color}20` }]}
                    >
                      <Ionicons
                        color={metric.color}
                        name={metric.icon}
                        size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                      />
                    </View>
                    <View style={styles.metricTextContainer}>
                      <ThemedText style={styles.metricText} type="body" variant="primary">
                        {metric.text}
                      </ThemedText>
                    </View>
                  </View>
                </Animated.View>
              </Fragment>
            ))}
          </View>
        )}
      </View>

      {/* Action Button - Final hierarchy level with Link navigation */}
      <Animated.View
        entering={FadeIn.delay(
          encouragingMetrics ? COMPLETION_BUTTON_DELAY.WITH_METRICS : COMPLETION_BUTTON_DELAY.BASE
        ).duration(TIMING_CONFIG.GENTLE.duration)}
        style={styles.buttonContainer}
      >
        {fromRemember ? (
          <Link href={ROUTE_PATHS.STUDY_TAB} dismissTo={true} asChild>
            <ThemedButton title={buttonText} style={styles.button} />
          </Link>
        ) : (
          <Link href=".." replace asChild>
            <ThemedButton title={buttonText} style={styles.button} />
          </Link>
        )}
      </Animated.View>
    </View>
  );

  if (useThemedView) {
    return (
      <ThemedView style={styles.container} useSafeArea={true} testID={testID}>
        {Content}
      </ThemedView>
    );
  }

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
    padding: LAYOUT.SPACING.XLARGE, // Increased for better breathing room
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: LAYOUT.REVIEW.COMPLETION.CONTENT_MAX_WIDTH,
    width: '100%',
  },

  iconContainer: {
    alignItems: 'center',
    height: LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE + LAYOUT.SPACING.LARGE, // Reduced height for better proportion
    justifyContent: 'center',
    ...createMargin({ bottom: 'XXLARGE' }), // Increased for stronger visual separation
  },
  metricContent: {
    alignItems: 'center',
    flexDirection: 'row',
    ...createPadding({ vertical: 'TINY' }),
  },
  metricIconContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM, // Increased for better proportion
    justifyContent: 'center',
    ...createMargin({ right: 'MEDIUM' }),
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM, // Square container
  },
  metricItem: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    ...createPadding({ horizontal: 'LARGE', vertical: 'TINY' }),
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  metricText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM, // Proper typography scale instead of spacing
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL, // Proper line height calculation
    textAlign: 'left',
  },
  metricTextContainer: {
    flex: 1,
    justifyContent: 'center', // Center text vertically with icon
  },
  metricsContainer: {
    gap: LAYOUT.SPACING.SMALL, // Reduced gap between metric items
    marginTop: LAYOUT.SPACING.MEDIUM, // Reduced top margin
    width: '100%',
  },
  button: {
    alignSelf: 'stretch', // Stretch to full width for better alignment
  },
  buttonContainer: {
    width: '100%', // Full width container
    paddingHorizontal: LAYOUT.SPACING.XLARGE, // Generous horizontal padding
  },
  subtitleText: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY, // Small margin for text grouping
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XXLARGE, // Increased for better visual separation
    width: '100%',
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.MEDIUM, // Consistent spacing scale
    textAlign: 'center',
  },
});

export default CompletionScreen;
