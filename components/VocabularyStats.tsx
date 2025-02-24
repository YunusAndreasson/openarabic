import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = 4;
const CARD_WIDTH = (SCREEN_WIDTH - LAYOUT.SCREEN_EDGE_PADDING * 2 - CARD_MARGIN) / 2;

interface VocabularyStatsProps {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
}

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

export function VocabularyStats({
  totalWords,
  dueWords,
  masteredWords,
  learningWords,
}: VocabularyStatsProps) {
  const colors = useColors();
  const progress = totalWords > 0 ? (masteredWords / totalWords) * 100 : 0;

  const stats = [
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
  ];

  return (
    <View style={styles.container}>
      {/* Progress Overview */}
      <View
        style={[
          styles.progressCard,
          {
            backgroundColor: colors.cardBackground,
            shadowColor: colors.shadow,
          },
        ]}
      >
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
            <Canvas style={styles.circleCanvas}>
              <Circle
                cx={40}
                cy={40}
                r={32}
                color={colors.text + '10'}
                style="stroke"
                strokeWidth={6}
              />
              <Path
                path={createArcPath(progress, 32)}
                color={colors.text}
                style="stroke"
                strokeWidth={6}
                transform={[{ translateX: 8 }, { translateY: 8 }]}
              />
            </Canvas>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        {stats.map(stat => (
          <View
            key={stat.label}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.cardBackground,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.statContent}>
              <View style={[styles.iconContainer, { backgroundColor: colors.text + '10' }]}>
                <Ionicons
                  name={stat.icon as any}
                  size={18}
                  color={colors.text}
                  style={styles.icon}
                />
              </View>
              <View style={styles.statTextContainer}>
                <ThemedText style={styles.value}>{stat.value}</ThemedText>
                <ThemedText style={styles.label}>{stat.label}</ThemedText>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  progressCard: {
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    height: 120,
    marginBottom: LAYOUT.SPACING.SMALL,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  progressContent: {
    padding: LAYOUT.CARD.PADDING.SMALL,
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressTextContainer: {
    flex: 1,
  },
  progressLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: '600',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  progressValue: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
    fontWeight: '700',
    opacity: LAYOUT.OPACITY.DIMMED,
    marginBottom: LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
  },
  progressSubtext: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  circleCanvas: {
    width: 80,
    height: 80,
    marginTop: -LAYOUT.SPACING.TINY,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_MARGIN,
  },
  statCard: {
    width: CARD_WIDTH,
    height: 84,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
    ...LAYOUT.SHADOW.MEDIUM,
  },
  statContent: {
    padding: LAYOUT.CARD.PADDING.SMALL,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: LAYOUT.CARD.BORDER_RADIUS.SMALL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  statTextContainer: {
    marginLeft: LAYOUT.SPACING.SMALL,
    flex: 1,
  },
  value: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
    opacity: LAYOUT.OPACITY.DIMMED,
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    opacity: LAYOUT.OPACITY.DISABLED,
  },
});
