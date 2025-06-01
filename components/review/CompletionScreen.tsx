import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { ThemedView } from '@/components/ThemedView';
import { TIMING_CONFIG, SPRING_CONFIG } from '@/hooks/animations/animationConfigs';
import { lightFeedback } from '@/utils/haptics';

interface SessionMetrics {
  wordsReviewed: number;
  wordsKnown: number;
  wordsVague: number;
  wordsUnknown: number;
  averageStabilityIncrease: number;
  longestStreak: number;
  currentStreak: number;
  masteredWords: number;
  startTime: number;
}

interface CompletionScreenProps {
  onClose: () => void;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonVariant?: 'filled' | 'outlined';
  iconName?: string;
  iconSize?: number;
  useThemedView?: boolean;
  contentStyle?: object;
  buttonStyle?: object;
  sessionMetrics?: SessionMetrics;
}

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  onClose,
  title = 'Great job!',
  subtitle = 'You completed your review session.',
  buttonText = 'ALHAMDULILLAH',
  buttonVariant = 'outlined',
  iconName = 'checkmark-circle',
  iconSize = 100,
  useThemedView = false,
  contentStyle = {},
  buttonStyle = {},
  sessionMetrics,
}) => {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Animation values for enhanced feedback
  const iconScale = useSharedValue(0.8);
  const iconOpacity = useSharedValue(0);

  // Only invalidate queries for review flow
  React.useEffect(() => {
    if (!useThemedView && user?.id) {
      queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return key === 'dueWords' || key === 'studyWords' || key === 'vocabularyStats';
        },
      });
    }
  }, [user?.id, queryClient, useThemedView]);

  // Enhanced icon animation with haptic feedback
  React.useEffect(() => {
    const startIconAnimation = () => {
      'worklet';
      iconOpacity.value = withDelay(
        200,
        withTiming(1, TIMING_CONFIG.GENTLE, finished => {
          if (finished) {
            runOnJS(lightFeedback)();
          }
        })
      );
      iconScale.value = withDelay(
        200,
        withSpring(1, {
          ...SPRING_CONFIG.CARD,
          damping: 12,
          stiffness: 100,
        })
      );
    };

    startIconAnimation();
  }, [iconScale, iconOpacity]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  // Generate encouraging metrics text without emojis
  const getEncouragingMetrics = () => {
    if (!sessionMetrics || sessionMetrics.wordsReviewed === 0) {
      return null;
    }

    const metrics = sessionMetrics;
    const sessionDuration = Math.round((Date.now() - metrics.startTime) / 60000); // minutes
    const accuracyRate = Math.round((metrics.wordsKnown / metrics.wordsReviewed) * 100);

    const encouragingFacts: Array<{
      text: string;
      icon: string;
      color: string;
      type: 'accuracy' | 'streak' | 'mastery' | 'efficiency' | 'effort';
    }> = [];

    // Accuracy achievement
    if (accuracyRate >= 80) {
      encouragingFacts.push({
        text: `${accuracyRate}% accuracy - excellent recall!`,
        icon: 'target',
        color: colors.completionSuccess,
        type: 'accuracy',
      });
    } else if (accuracyRate >= 60) {
      encouragingFacts.push({
        text: `${accuracyRate}% accuracy - solid progress!`,
        icon: 'trending-up',
        color: colors.progressIndicator,
        type: 'accuracy',
      });
    } else if (metrics.wordsKnown > 0) {
      encouragingFacts.push({
        text: `${metrics.wordsKnown} words mastered this session!`,
        icon: 'checkmark-circle',
        color: colors.completionSuccess,
        type: 'mastery',
      });
    }

    // Streak achievements
    if (metrics.longestStreak >= 5) {
      encouragingFacts.push({
        text: `${metrics.longestStreak}-word streak - you're on fire!`,
        icon: 'flame',
        color: colors.warning,
        type: 'streak',
      });
    } else if (metrics.longestStreak >= 3) {
      encouragingFacts.push({
        text: `${metrics.longestStreak}-word streak achieved!`,
        icon: 'flash',
        color: colors.warning,
        type: 'streak',
      });
    }

    // Mastery progress
    if (metrics.masteredWords > 0) {
      encouragingFacts.push({
        text: `${metrics.masteredWords} words reached mastery level!`,
        icon: 'star',
        color: colors.completionSuccess,
        type: 'mastery',
      });
    }

    // Stability improvement
    if (metrics.averageStabilityIncrease > 0) {
      const avgIncrease = Math.round(metrics.averageStabilityIncrease * 10) / 10;
      encouragingFacts.push({
        text: `+${avgIncrease} days average memory strength boost!`,
        icon: 'bar-chart',
        color: colors.progressIndicator,
        type: 'efficiency',
      });
    }

    // Session efficiency
    if (sessionDuration > 0 && metrics.wordsReviewed >= 10) {
      const wordsPerMinute = Math.round((metrics.wordsReviewed / sessionDuration) * 10) / 10;
      encouragingFacts.push({
        text: `${wordsPerMinute} words/min - efficient learning!`,
        icon: 'speedometer',
        color: colors.info,
        type: 'efficiency',
      });
    }

    // Effort recognition
    if (metrics.wordsReviewed >= 20) {
      encouragingFacts.push({
        text: `${metrics.wordsReviewed} words reviewed - dedication pays off!`,
        icon: 'trophy',
        color: colors.warning,
        type: 'effort',
      });
    } else if (metrics.wordsReviewed >= 10) {
      encouragingFacts.push({
        text: `${metrics.wordsReviewed} words reviewed - great effort!`,
        icon: 'thumbs-up',
        color: colors.completionSuccess,
        type: 'effort',
      });
    }

    return encouragingFacts.slice(0, 3); // Show max 3 encouraging facts
  };

  const encouragingMetrics = getEncouragingMetrics();

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      <Animated.View
        style={[styles.iconContainer, iconAnimatedStyle]}
        entering={ZoomIn.delay(100).duration(400).springify()}
      >
        <Ionicons name={iconName as any} size={iconSize} color={colors.completionSuccess} />
      </Animated.View>

      <View style={styles.textContainer}>
        <Animated.View entering={FadeInUp.delay(400).duration(300)}>
          <ThemedText type="heading2" variant="primary" style={styles.titleText}>
            {title}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(300)}>
          <ThemedText type="heading3" variant="secondary" style={styles.subtitleText}>
            {subtitle}
          </ThemedText>
        </Animated.View>

        {/* Display encouraging metrics with enhanced styling */}
        {encouragingMetrics && encouragingMetrics.length > 0 && (
          <View style={styles.metricsContainer}>
            {encouragingMetrics.map((metric, index) => (
              <React.Fragment key={index}>
                <Animated.View
                  style={styles.metricItem}
                  entering={FadeInUp.delay(800 + index * 150).duration(300)}
                >
                  <View style={styles.metricContent}>
                    <View
                      style={[styles.metricIconContainer, { backgroundColor: `${metric.color}20` }]}
                    >
                      <Ionicons name={metric.icon as any} size={22} color={metric.color} />
                    </View>
                    <View style={styles.metricTextContainer}>
                      <ThemedText type="body" variant="primary" style={styles.metricText}>
                        {metric.text}
                      </ThemedText>
                    </View>
                  </View>
                </Animated.View>
              </React.Fragment>
            ))}
          </View>
        )}
      </View>

      <Animated.View entering={FadeIn.delay(encouragingMetrics ? 1400 : 1000).duration(300)}>
        <ThemedButton
          title={buttonText}
          onPress={onClose}
          variant={buttonVariant}
          style={[styles.doneButton, buttonStyle]}
        />
      </Animated.View>
    </View>
  );

  if (useThemedView) {
    return (
      <ThemedView style={styles.container} useSafeArea={true}>
        {Content}
      </ThemedView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
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
    maxWidth: 350,
    width: '100%',
  },
  doneButton: {
    marginTop: LAYOUT.SPACING.LARGE,
    minWidth: 150,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
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
  metricsContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
    gap: LAYOUT.SPACING.SMALL,
  },
  metricItem: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  metricContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  metricTextContainer: {
    flex: 1,
  },
  metricText: {
    textAlign: 'left',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
});

export default CompletionScreen;
