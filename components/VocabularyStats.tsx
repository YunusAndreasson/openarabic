import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  vec,
  Circle,
  Path,
  Skia,
} from '@shopify/react-native-skia';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = 8;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_MARGIN) / 2;

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
      <View style={[styles.progressCard, { backgroundColor: colors.cardBackground }]}>
        <Canvas style={styles.progressCanvas}>
          <RoundedRect
            x={0}
            y={0}
            width={SCREEN_WIDTH - HORIZONTAL_PADDING * 2}
            height={120}
            r={16}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(SCREEN_WIDTH - HORIZONTAL_PADDING * 2, 120)}
              colors={[colors.text + '08', colors.text + '02']}
            />
          </RoundedRect>
        </Canvas>
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
            style={[styles.statCard, { backgroundColor: colors.cardBackground }]}
          >
            <Canvas style={styles.cardCanvas}>
              <RoundedRect x={0} y={0} width={CARD_WIDTH} height={84} r={16}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(CARD_WIDTH, 84)}
                  colors={[colors.text + '08', colors.text + '02']}
                />
              </RoundedRect>
            </Canvas>
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
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  progressCard: {
    borderRadius: 16,
    height: 120,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressCanvas: {
    position: 'absolute',
    width: SCREEN_WIDTH - HORIZONTAL_PADDING * 2,
    height: 120,
  },
  progressContent: {
    padding: 20,
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
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 36,
    fontWeight: '700',
    opacity: 0.9,
    marginBottom: 8,
    lineHeight: 36,
  },
  progressSubtext: {
    fontSize: 13,
    opacity: 0.5,
  },
  circleCanvas: {
    width: 80,
    height: 80,
    marginTop: -4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_MARGIN,
  },
  statCard: {
    width: CARD_WIDTH,
    height: 84,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardCanvas: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: 84,
  },
  statContent: {
    padding: 12,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    opacity: 0.8,
  },
  statTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    opacity: 0.9,
  },
  label: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
});
