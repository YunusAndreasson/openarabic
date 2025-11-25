import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Fragment, type ComponentProps, type FC } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useEncouragingMetrics, useReviewCompletion } from '@/hooks/review';
import { useStudyStreak } from '@/hooks/study';
import { useColors } from '@/hooks/theme/useColors';
import { UiAction } from '@/types/enums';
import type { SessionMetrics } from '@/types/review.types';
import { withOpacity } from '@/utils/colorUtils';
import { createMargin, createPadding, COMMON_STYLES } from '@/utils/layoutUtils';

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

  // Fetch current daily study streak
  const { streak } = useStudyStreak();
  const currentDailyStreak = streak?.currentStreak ?? 0;

  // Handle review completion logic (query invalidation, analytics, haptics)
  useReviewCompletion(sessionMetrics, true);

  const encouragingMetrics = useEncouragingMetrics(sessionMetrics, colors, currentDailyStreak);

  const Content = (
    <View style={[styles.contentContainer, contentStyle || {}]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View
        entering={ZoomIn.duration(TIMING_CONFIG.FAST.duration).springify()}
        style={styles.iconContainer}
      >
        <Ionicons color={colors.completionSuccess} name={iconName} size={iconSize} />
      </Animated.View>

      {/* Title Group - Closely grouped for Gestalt proximity */}
      <View style={styles.titleGroup}>
        <Animated.View entering={FadeInUp.delay(50).duration(TIMING_CONFIG.FAST.duration)}>
          <ThemedText colorName="headingText" style={styles.titleText} type="heading1">
            {title}
          </ThemedText>
        </Animated.View>

        {subtitle && (
          <Animated.View entering={FadeInUp.delay(100).duration(TIMING_CONFIG.FAST.duration)}>
            <ThemedText colorName="subtitleText" style={styles.subtitleText} type="heading3">
              {subtitle}
            </ThemedText>
          </Animated.View>
        )}

        {/* Educational text - grouped with title for clarity */}
        <Animated.View entering={FadeInUp.delay(120).duration(TIMING_CONFIG.FAST.duration)}>
          <ThemedText colorName="secondary" style={styles.educationalText} type="body">
            {STRINGS.SESSION_COMPLETE_EDUCATIONAL}
          </ThemedText>
        </Animated.View>
      </View>

      {/* Metrics Section - Separated group for visual hierarchy */}
      {encouragingMetrics && encouragingMetrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {encouragingMetrics.map((metric, index) => (
            <Fragment key={metric.type + metric.text}>
              <Animated.View
                entering={FadeInUp.delay(180 + index * 40).duration(TIMING_CONFIG.FAST.duration)}
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

      {/* Spacer to push button to bottom */}
      <View style={styles.spacer} />

      {/* Action Button - Anchored to bottom */}
      <Animated.View
        entering={FadeIn.delay(encouragingMetrics ? 320 : 220).duration(
          TIMING_CONFIG.FAST.duration,
        )}
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
  },

  // Metrics section - separated from title group
  metricsContainer: {
    gap: LAYOUT.SPACING.SMALL,
    width: '100%',
  },

  metricItem: {
    ...COMMON_STYLES.roundedMedium,
    ...createPadding({ horizontal: 'LARGE', vertical: 'TINY' }),
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
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
    fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
    lineHeight:
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.NORMAL,
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
