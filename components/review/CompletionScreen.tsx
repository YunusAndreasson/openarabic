import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Fragment, type ComponentProps, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useEncouragingMetrics, useReviewCompletion } from '@/hooks/review';
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
  useThemedView?: boolean;
  contentStyle?: object;
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
  useThemedView = false,
  contentStyle,
  sessionMetrics,
  testID,
  fromRemember = false,
}) => {
  const colors = useColors();

  // Handle review completion logic (query invalidation, analytics, haptics)
  // Only execute for review flow (not for generic completion screens)
  useReviewCompletion(sessionMetrics, !useThemedView);

  const encouragingMetrics = useEncouragingMetrics(sessionMetrics, colors);

  const Content = (
    <View style={[styles.contentContainer, contentStyle || {}]}>
      {/* Success Icon - Primary visual element */}
      <Animated.View
        entering={ZoomIn.duration(TIMING_CONFIG.FAST.duration).springify()}
        style={styles.iconContainer}
      >
        <Ionicons color={colors.completionSuccess} name={iconName} size={iconSize} />
      </Animated.View>

      {/* Text Content - Secondary hierarchy */}
      <View style={styles.textContainer}>
        <Animated.View entering={FadeInUp.delay(50).duration(TIMING_CONFIG.FAST.duration)}>
          <ThemedText colorName="headingText" style={styles.titleText} type="heading2">
            {title}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).duration(TIMING_CONFIG.FAST.duration)}>
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
                  entering={FadeInUp.delay(150 + index * 40).duration(TIMING_CONFIG.FAST.duration)}
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
        entering={FadeIn.delay(encouragingMetrics ? 300 : 200).duration(TIMING_CONFIG.FAST.duration)}
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
    ...COMMON_STYLES.row,
    ...createPadding({ vertical: 'TINY' }),
  },
  metricIconContainer: {
    ...COMMON_STYLES.centeredRow,
    ...COMMON_STYLES.roundedMedium,
    height: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM, // Increased for better proportion
    ...createMargin({ right: 'MEDIUM' }),
    width: LAYOUT.BUTTON.ICON_SIZE.XLARGE + LAYOUT.SPACING.MEDIUM, // Square container
  },
  metricItem: {
    ...COMMON_STYLES.roundedMedium,
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


