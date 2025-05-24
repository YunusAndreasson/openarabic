import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';

import Section from '@/components/Section';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { ThemedView } from '@/components/ThemedView';

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
  buttonText = 'Done',
  buttonVariant = 'filled',
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

  // Generate encouraging metrics text
  const getEncouragingMetrics = () => {
    if (!sessionMetrics || sessionMetrics.wordsReviewed === 0) {
      return null;
    }

    const metrics = sessionMetrics;
    const sessionDuration = Math.round((Date.now() - metrics.startTime) / 60000); // minutes
    const accuracyRate = Math.round((metrics.wordsKnown / metrics.wordsReviewed) * 100);

    const encouragingFacts = [];

    // Accuracy achievement
    if (accuracyRate >= 80) {
      encouragingFacts.push(`🎯 ${accuracyRate}% accuracy - excellent recall!`);
    } else if (accuracyRate >= 60) {
      encouragingFacts.push(`📈 ${accuracyRate}% accuracy - solid progress!`);
    } else if (metrics.wordsKnown > 0) {
      encouragingFacts.push(`💪 ${metrics.wordsKnown} words mastered this session!`);
    }

    // Streak achievements
    if (metrics.longestStreak >= 5) {
      encouragingFacts.push(`🔥 ${metrics.longestStreak}-word streak - you're on fire!`);
    } else if (metrics.longestStreak >= 3) {
      encouragingFacts.push(`⚡ ${metrics.longestStreak}-word streak achieved!`);
    }

    // Mastery progress
    if (metrics.masteredWords > 0) {
      encouragingFacts.push(`🌟 ${metrics.masteredWords} words reached mastery level!`);
    }

    // Stability improvement
    if (metrics.averageStabilityIncrease > 0) {
      const avgIncrease = Math.round(metrics.averageStabilityIncrease * 10) / 10;
      encouragingFacts.push(`📊 +${avgIncrease} days average memory strength boost!`);
    }

    // Session efficiency
    if (sessionDuration > 0 && metrics.wordsReviewed >= 10) {
      const wordsPerMinute = Math.round((metrics.wordsReviewed / sessionDuration) * 10) / 10;
      encouragingFacts.push(`⚡ ${wordsPerMinute} words/min - efficient learning!`);
    }

    // Effort recognition
    if (metrics.wordsReviewed >= 20) {
      encouragingFacts.push(`🏆 ${metrics.wordsReviewed} words reviewed - dedication pays off!`);
    } else if (metrics.wordsReviewed >= 10) {
      encouragingFacts.push(`👏 ${metrics.wordsReviewed} words reviewed - great effort!`);
    }

    return encouragingFacts.slice(0, 3); // Show max 3 encouraging facts
  };

  const encouragingMetrics = getEncouragingMetrics();

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      <Section delay={100} animated>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={iconSize} color={colors.completionSuccess} />
        </View>
      </Section>
      <View style={styles.textContainer}>
        <Section delay={300} animated>
          <ThemedText type="heading2" variant="primary" style={styles.titleText}>
            {title}
          </ThemedText>
        </Section>
        <Section delay={500} animated>
          <ThemedText type="heading3" variant="primary" style={styles.subtitleText}>
            {subtitle}
          </ThemedText>
        </Section>

        {/* Display encouraging metrics */}
        {encouragingMetrics && encouragingMetrics.length > 0 && (
          <View style={styles.metricsContainer}>
            {encouragingMetrics.map((metric, index) => (
              <Section key={index} delay={700 + index * 200} animated>
                <View style={styles.metricItem}>
                  <ThemedText type="body" variant="secondary" style={styles.metricText}>
                    {metric}
                  </ThemedText>
                </View>
              </Section>
            ))}
          </View>
        )}
      </View>
      <Section delay={encouragingMetrics ? 1300 : 700} animated>
        <ThemedButton
          title={buttonText}
          onPress={onClose}
          variant={buttonVariant}
          style={[styles.doneButton, buttonStyle]}
        />
      </Section>
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
    padding: LAYOUT.SPACING.XLARGE,
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
    marginBottom: LAYOUT.SPACING.XLARGE * 1.5,
  },
  subtitleText: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE * 1.5,
    width: '100%',
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
  },
  metricsContainer: {
    marginTop: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  metricItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginVertical: LAYOUT.SPACING.XSMALL,
  },
  metricText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default CompletionScreen;
