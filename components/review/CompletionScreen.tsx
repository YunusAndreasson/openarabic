import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, Fragment, type FC, type ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet, InteractionManager } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  TIMING_CONFIG,
  COMPLETION_METRIC_BASE_DELAY,
  COMPLETION_METRIC_STAGGER,
  COMPLETION_BUTTON_DELAY,
  ICON_ENTRANCE_DURATION,
  COMPLETION_TITLE_DELAY,
  COMPLETION_SUBTITLE_DELAY,
  QUICK_ANIMATION_DURATION,
} from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEncouragingMetrics } from '@/hooks/review/useEncouragingMetrics';
import { useColors } from '@/hooks/theme/useColors';
import type { SessionMetrics } from '@/types/review.types';
import { successFeedback } from '@/utils/haptics';

const EMPTY_OBJECT = {};

interface CompletionScreenProps {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonVariant?: 'filled' | 'outlined';
  iconName?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  useThemedView?: boolean;
  contentStyle?: object;
  buttonStyle?: object;
  sessionMetrics?: SessionMetrics;
  testID?: string;
}

const CompletionScreen: FC<CompletionScreenProps> = ({
  onClose,
  title = STRINGS.SESSION_COMPLETE,
  subtitle = STRINGS.ALL_WORDS_PRACTICED,
  buttonText = STRINGS.CONTINUE,
  buttonVariant = 'outlined',
  iconName = 'checkmark-circle',
  iconSize = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE,
  useThemedView = false,
  contentStyle = EMPTY_OBJECT,
  buttonStyle = EMPTY_OBJECT,
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
    <View style={[styles.contentContainer, contentStyle]}>
      <Animated.View
        entering={ZoomIn.delay(QUICK_ANIMATION_DURATION)
          .duration(ICON_ENTRANCE_DURATION)
          .springify()}
        style={styles.iconContainer}
      >
        <Ionicons color={colors.completionSuccess} name={iconName} size={iconSize} />
      </Animated.View>

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

        {/* Display encouraging metrics with enhanced styling */}
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

      <Animated.View
        entering={FadeIn.delay(
          encouragingMetrics ? COMPLETION_BUTTON_DELAY.WITH_METRICS : COMPLETION_BUTTON_DELAY.BASE
        ).duration(TIMING_CONFIG.GENTLE.duration)}
      >
        <ThemedButton
          style={[styles.doneButton, buttonStyle]}
          title={buttonText}
          variant={buttonVariant}
          onPress={onClose}
        />
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
    padding: LAYOUT.SPACING.LARGE,
  } as ViewStyle,
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: LAYOUT.REVIEW.COMPLETION.CONTENT_MAX_WIDTH,
    width: '100%',
  },
  doneButton: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    minWidth: LAYOUT.CALENDAR.EVENT_RIGHT_SECTION.MAX_WIDTH,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    alignItems: 'center',
    height: LAYOUT.REVIEW.COMPLETION.ICON_CONTAINER_HEIGHT,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  metricContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  metricIconContainer: {
    alignItems: 'center',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.SMALL,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.SMALL,
  },
  metricItem: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  metricText: {
    fontSize: LAYOUT.SPACING.LARGE,
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    lineHeight: LAYOUT.SPACING.XXLARGE,
    textAlign: 'left',
  },
  metricTextContainer: {
    flex: 1,
  },
  metricsContainer: {
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  subtitleText: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
    width: '100%',
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
});

export default CompletionScreen;
