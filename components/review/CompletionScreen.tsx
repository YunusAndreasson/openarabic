import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { ComponentProps, FC } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
import { FONTS } from '@/constants/fonts';
import {
  getThemeAwareElevation,
  LAYOUT,
  LINE_HEIGHT_MULTIPLIERS,
} from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useEncouragingMetrics, useReviewCompletion } from '@/hooks/review';
import { useStudyStreak } from '@/hooks/practice';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { UiAction } from '@/types/enums';
import type { SessionMetrics } from '@/types/review.types';
import { withAlpha } from '@/utils/colorUtils';
import { createMargin, createPadding, COMMON_STYLES } from '@/utils/layoutUtils';

// Layout animation builders hoisted to module level per Reanimated best practices
const ENTERING_ICON = ZoomIn.duration(TIMING_CONFIG.FAST.duration).springify();
const ENTERING_TITLE = FadeInUp.delay(TIMING_CONSTANTS.STAGGER.BASE).duration(
  TIMING_CONFIG.FAST.duration,
);
const ENTERING_SUBTITLE = FadeInUp.delay(TIMING_CONSTANTS.STAGGER.FAST).duration(
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

interface CompletionScreenProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  iconName?: ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
  contentStyle?: ViewStyle;
  sessionMetrics?: SessionMetrics;
  testID?: string;
  fromRemember?: boolean; // For dismissTo navigation
}

export const CompletionScreen: FC<CompletionScreenProps> = ({
  title = STRINGS.SESSION_COMPLETE,
  subtitle,
  buttonText = UiAction.CONTINUE,
  iconName = 'checkmark-circle',
  iconSize = LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE,
  contentStyle,
  sessionMetrics,
  testID,
  fromRemember = false,
}) => {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();

  // Fetch current daily study streak
  const { streak } = useStudyStreak();
  const currentDailyStreak = streak?.currentStreak ?? 0;

  // Handle review completion logic (query invalidation, analytics, haptics)
  useReviewCompletion(sessionMetrics, true);

  const encouragingResult = useEncouragingMetrics(sessionMetrics, colors, currentDailyStreak);

  const Content = (
    <View style={[styles.contentContainer, contentStyle]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View entering={ENTERING_ICON} style={styles.iconContainer}>
        <Ionicons color={colors.completionSuccess} name={iconName} size={iconSize} />
      </Animated.View>

      {/* Title Group - Closely grouped for Gestalt proximity */}
      <View style={styles.titleGroup}>
        <Animated.View entering={ENTERING_TITLE}>
          <ThemedText colorName="headingText" style={styles.titleText} type="heading1">
            {title}
          </ThemedText>
        </Animated.View>

        {subtitle && (
          <Animated.View entering={ENTERING_SUBTITLE}>
            <ThemedText colorName="subtitleText" style={styles.subtitleText} type="heading3">
              {subtitle}
            </ThemedText>
          </Animated.View>
        )}

        {/* Educational text - contextual based on session performance */}
        <Animated.View entering={ENTERING_EDUCATIONAL}>
          <ThemedText colorName="secondary" style={styles.educationalText} type="body">
            {encouragingResult?.educationalText ?? STRINGS.SESSION_ED_DEFAULT_POOL[0]}
          </ThemedText>
        </Animated.View>
      </View>

      {/* Metrics Section - Separated group for visual hierarchy */}
      {encouragingResult && encouragingResult.metrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {encouragingResult.metrics.map((metric, index) => (
            <Animated.View
              key={metric.type + metric.text}
              entering={ENTERING_METRICS[index]}
              style={[
                styles.metricItem,
                {
                  backgroundColor: colors.card,
                  shadowColor: colors.shadow,
                },
                getThemeAwareElevation('SUBTLE', isDarkMode),
              ]}
            >
              <View style={styles.metricContent}>
                <View
                  style={[
                    styles.metricIconContainer,
                    { backgroundColor: withAlpha(metric.color, 0.12) },
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
              </View>
            </Animated.View>
          ))}
        </View>
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
        {fromRemember ? (
          <Link href={ROUTE_PATHS.PRACTICE_TAB} dismissTo={true} asChild>
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
    marginBottom: LAYOUT.SPACING.SMALL, // Tight grouping with subtitle
  },

  subtitleText: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL, // Tight grouping with educational text
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

  metricItem: {
    ...COMMON_STYLES.roundedMedium,
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

  // Spacer to push button to bottom
  spacer: {
    flex: 1,
  },

  // Button anchored to bottom
  buttonContainer: {
    width: '100%',
    paddingBottom: LAYOUT.SPACING.LARGE, // Extra padding at bottom
  },

  button: {
    alignSelf: 'stretch',
  },
});
