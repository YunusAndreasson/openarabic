import React, { useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = LAYOUT.SPACING.SMALL;
const CARD_WIDTH = (SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2 - CARD_MARGIN) / 2;

interface VocabularyStatsProps {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
}

// Memoize the arc path creation function to prevent recalculation
const createArcPath = (progress: number, radius: number): string => {
  const center = radius;
  const startAngle = -Math.PI / 2; // Start from top
  const endAngle = startAngle + (2 * Math.PI * progress) / 100;

  const x1 = center + radius * Math.cos(startAngle);
  const y1 = center + radius * Math.sin(startAngle);
  const x2 = center + radius * Math.cos(endAngle);
  const y2 = center + radius * Math.sin(endAngle);

  const largeArcFlag = progress > 50 ? 1 : 0;

  return `M ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};

// Create a memoized stat card component
const StatCard = React.memo(
  ({ label, value, icon, colors }: { label: string; value: number; icon: string; colors: any }) => {
    const cardStyle = useMemo(
      () => [
        styles.statCard,
        {
          backgroundColor: colors.cardBackground,
          shadowColor: colors.shadow,
          borderColor: colors.cardBorder,
        },
      ],
      [colors.cardBackground, colors.shadow, colors.cardBorder]
    );

    const iconContainerStyle = useMemo(
      () => [
        styles.iconContainer,
        {
          backgroundColor: `${colors.text}10`,
          borderColor: colors.cardBorder + '40',
        },
      ],
      [colors.text, colors.cardBorder]
    );

    const iconStyle = useMemo(() => ({ color: colors.icon }), [colors.icon]);

    return (
      <View style={cardStyle}>
        <View style={styles.statContent}>
          <View style={styles.statTextContainer}>
            <ThemedText style={styles.statValue}>{value}</ThemedText>
            <ThemedText style={styles.statLabel}>{label}</ThemedText>
          </View>
          <View style={iconContainerStyle}>
            <Ionicons name={icon as any} size={24} color={iconStyle.color} />
          </View>
        </View>
      </View>
    );
  }
);

function VocabularyStatsComponent({
  totalWords,
  dueWords,
  masteredWords,
  learningWords,
}: VocabularyStatsProps) {
  const colors = useColors();

  // Memoize the progress calculation
  const progress = useMemo(
    () => (totalWords > 0 ? (masteredWords / totalWords) * 100 : 0),
    [totalWords, masteredWords]
  );

  // Memoize the stats array
  const stats = useMemo(
    () => [
      {
        label: 'Due Today',
        value: dueWords,
        icon: 'time-outline',
      },
      {
        label: 'Mastered',
        value: masteredWords,
        icon: 'checkmark-circle-outline',
      },
      {
        label: 'Learning',
        value: learningWords,
        icon: 'school-outline',
      },
    ],
    [dueWords, masteredWords, learningWords]
  );

  // Memoize the arc path
  const arcPath = useMemo(() => createArcPath(progress, 32), [progress]);

  // Memoize styles
  const progressCardStyle = useMemo(
    () => [
      styles.progressCard,
      {
        backgroundColor: colors.cardBackground,
        shadowColor: colors.shadow,
        borderColor: colors.cardBorder,
      },
    ],
    [colors.cardBackground, colors.shadow, colors.cardBorder]
  );

  const circleBackgroundColor = useMemo(() => `${colors.text}10`, [colors.text]);

  return (
    <View style={styles.container}>
      {/* Progress Overview */}
      <View style={progressCardStyle}>
        <View style={styles.progressContent}>
          <View style={styles.progressRow}>
            <View style={styles.progressTextContainer}>
              <ThemedText style={styles.progressLabel}>Progress</ThemedText>
              <ThemedText style={styles.progressValue}>{progress.toFixed(0)}%</ThemedText>
              <ThemedText style={styles.progressSubtext}>
                {masteredWords} of {totalWords} words mastered
              </ThemedText>
            </View>

            {/* Circular Progress */}
            <View style={styles.circleContainer}>
              <Canvas style={styles.circleCanvas}>
                <Circle
                  cx={40}
                  cy={40}
                  r={32}
                  color={circleBackgroundColor}
                  style="stroke"
                  strokeWidth={6}
                />
                <Path
                  path={arcPath}
                  color={colors.text}
                  style="stroke"
                  strokeWidth={6}
                  transform={[{ translateX: 8 }, { translateY: 8 }]}
                />
              </Canvas>
            </View>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

// Memoize the entire component
export const VocabularyStats = React.memo(VocabularyStatsComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  progressCard: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    height: 130,
    marginBottom: LAYOUT.SPACING.MEDIUM,
    overflow: 'hidden',
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.LARGE,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
  },
  progressTextContainer: {
    flex: 1,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  progressLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  progressValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: '700',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.SMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  progressSubtext: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  circleCanvas: {
    width: 80,
    height: 80,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_MARGIN,
    justifyContent: 'space-between',
  },
  statCard: {
    width: CARD_WIDTH,
    height: 90,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.LARGE,
    overflow: 'hidden',
    marginBottom: LAYOUT.SPACING.SMALL,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    ...LAYOUT.SHADOW.MEDIUM,
    elevation: 3,
  },
  statContent: {
    padding: LAYOUT.CARD.PADDING.MEDIUM,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTextContainer: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
  },
  statValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  statLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
});
