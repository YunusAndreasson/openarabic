import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';
import type { ComponentProps } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { TIMING_CONFIG, useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
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

const CompletionScreen: React.FC<CompletionScreenProps> = ({
  onClose,
  title = 'Great job',
  subtitle = 'You completed your review session.',
  buttonText = 'Continue',
  buttonVariant = 'outlined',
  iconName = 'checkmark-circle',
  iconSize = 100,
  useThemedView = false,
  contentStyle = EMPTY_OBJECT,
  buttonStyle = EMPTY_OBJECT,
  sessionMetrics,
  testID,
}) => {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Animation values for enhanced feedback using hooks
  const { animatedStyle: opacityStyle, startAnimation: startOpacityAnimation } =
    useOpacityAnimation({
      initialOpacity: 0,
      duration: TIMING_CONFIG.GENTLE.duration,
    });

  const { animatedStyle: scaleStyle, startAnimation: startScaleAnimation } = useTransformAnimation({
    type: 'scale',
    initialValue: 0.8,
    targetValue: 1,
    useSpring: true,
    damping: 12,
    stiffness: 100,
  });

  // Only invalidate queries for review flow
  React.useEffect(() => {
    if (!useThemedView && user?.id) {
      queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return key === 'fsrs-words' || key === 'vocabulary-stats';
        },
      });
    }
  }, [user?.id, queryClient, useThemedView]);

  // Enhanced icon animation with haptic feedback
  React.useEffect(() => {
    const timer = setTimeout(() => {
      startOpacityAnimation(undefined, successFeedback);
      startScaleAnimation();
    }, 200);

    return () => clearTimeout(timer);
  }, [startOpacityAnimation, startScaleAnimation]);

  // Combine opacity and scale styles
  const iconAnimatedStyle = [opacityStyle, scaleStyle];

  const encouragingMetrics = useEncouragingMetrics(sessionMetrics, colors);

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      <Animated.View
        entering={ZoomIn.delay(100).duration(400).springify()}
        style={[styles.iconContainer, iconAnimatedStyle as unknown as ViewStyle]}
      >
        <Ionicons color={colors.completionSuccess} name={iconName} size={iconSize} />
      </Animated.View>

      <View style={styles.textContainer}>
        <Animated.View entering={FadeInUp.delay(400).duration(300)}>
          <ThemedText colorName="headingText" style={styles.titleText} type="heading2">
            {title}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(300)}>
          <ThemedText colorName="subtitleText" style={styles.subtitleText} type="heading3">
            {subtitle}
          </ThemedText>
        </Animated.View>

        {/* Display encouraging metrics with enhanced styling */}
        {encouragingMetrics && encouragingMetrics.length > 0 && (
          <View style={styles.metricsContainer}>
            {encouragingMetrics.map((metric, index) => (
              <React.Fragment key={metric.type + metric.text}>
                <Animated.View
                  entering={FadeInUp.delay(800 + index * 150).duration(300)}
                  style={styles.metricItem}
                >
                  <View style={styles.metricContent}>
                    <View
                      style={[styles.metricIconContainer, { backgroundColor: `${metric.color}20` }]}
                    >
                      <Ionicons color={metric.color} name={metric.icon} size={22} />
                    </View>
                    <View style={styles.metricTextContainer}>
                      <ThemedText style={styles.metricText} type="body" variant="primary">
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
          backgroundColor: colors.background,
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
    maxWidth: 350,
    width: '100%',
  },
  doneButton: {
    marginTop: LAYOUT.SPACING.MEDIUM,
    minWidth: 150,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  iconContainer: {
    alignItems: 'center',
    height: 120,
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
    height: 36,
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
    width: 36,
  },
  metricItem: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  metricText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
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
