import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, type ComponentProps, type FC } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  COMPLETION_BUTTON_DELAY,
  COMPLETION_METRIC_BASE_DELAY,
  COMPLETION_METRIC_STAGGER,
  COMPLETION_SUBTITLE_DELAY,
  COMPLETION_TITLE_DELAY,
  ICON_ENTRANCE_DURATION,
  QUICK_ANIMATION_DURATION,
  TIMING_CONFIG,
} from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEncouragingMetrics } from '@/hooks/review/useEncouragingMetrics';
import { useColors } from '@/hooks/theme/useColors';
import type { SessionMetrics } from '@/types/review.types';
import { successFeedback } from '@/utils/haptics';

interface CompletionScreenProps {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  iconName?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  useThemedView?: boolean;
  contentStyle?: object;
  sessionMetrics?: SessionMetrics;
  testID?: string;
}

const CompletionScreen: FC<CompletionScreenProps> = ({
  onClose,
  title = STRINGS.SESSION_COMPLETE,
  subtitle = STRINGS.ALL_WORDS_PRACTICED,
  buttonText = STRINGS.CONTINUE,
  iconName = 'checkmark-circle',
  iconSize = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE,
  useThemedView = false,
  contentStyle,
  sessionMetrics,
  testID,
}) => {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Only invalidate queries for review flow
  useEffect(() => {
    if (!useThemedView && user?.id) {
      // Defer query invalidation until after completion screen animation completes
      InteractionManager.runAfterInteractions(() => {
        queryClient.invalidateQueries({
          predicate: query => {
            const key = query.queryKey[0];
            return key === 'fsrs-words' || key === 'vocabulary-stats';
          },
        });
      });
    }
  }, [user?.id, queryClient, useThemedView]);

  // Trigger haptic feedback when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      successFeedback();
    }, QUICK_ANIMATION_DURATION + ICON_ENTRANCE_DURATION / 2);

    return () => clearTimeout(timer);
  }, []);

  const encouragingMetrics = useEncouragingMetrics(sessionMetrics, colors);

  const Content = (
    <View style={[styles.contentContainer, contentStyle || {}]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View
        entering={ZoomIn.delay(QUICK_ANIMATION_DURATION)
          .duration(ICON_ENTRANCE_DURATION)
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
                  style={styles.metricItem}
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

      {/* Action Button - Final hierarchy level */}
      <Animated.View
        entering={FadeIn.delay(
          encouragingMetrics ? COMPLETION_BUTTON_DELAY.WITH_METRICS : COMPLETION_BUTTON_DELAY.BASE
        ).duration(TIMING_CONFIG.GENTLE.duration)}
      >
        <ThemedButton title={buttonText} variant="filled" onPress={onClose} style={styles.button} />
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
    marginBottom: LAYOUT.SPACING.XXXLARGE, // Increased for stronger visual separation
  },
  metricContent: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: LAYOUT.SPACING.TINY, // Reduced padding for tighter spacing
  },
  metricIconContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM, // Increased for better proportion
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM, // Square container
  },
  metricItem: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.TINY, // Reduced vertical padding
    backgroundColor: 'rgba(0, 0, 0, 0.02)', // Subtle background for visual separation
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    borderColor: 'rgba(0, 0, 0, 0.05)', // Subtle border for definition
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
    alignSelf: 'center', // Center the button
    width: LAYOUT.BUTTON.HEIGHT.LARGE * 6, // Fixed width to match content
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
