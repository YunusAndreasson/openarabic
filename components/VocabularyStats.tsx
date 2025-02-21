import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface VocabularyStatsProps {
  totalWords: number;
  dueWords: number;
  masteredWords: number;
  learningWords: number;
}

export function VocabularyStats({
  totalWords,
  dueWords,
  masteredWords,
  learningWords,
}: VocabularyStatsProps) {
  const colors = useColors();

  const stats = [
    {
      label: 'Total Words',
      value: totalWords,
      icon: 'book-outline',
      color: colors.tint,
    },
    {
      label: 'Due Today',
      value: dueWords,
      icon: 'time-outline',
      color: colors.warning,
    },
    {
      label: 'Mastered',
      value: masteredWords,
      icon: 'checkmark-circle-outline',
      color: colors.success,
    },
    {
      label: 'Learning',
      value: learningWords,
      icon: 'school-outline',
      color: colors.info,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {stats.map((stat, _index) => (
          <View
            key={stat.label}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <BlurView intensity={10} tint="light" style={styles.iconContainer}>
              <View style={[styles.iconBackground, { backgroundColor: stat.color }]}>
                <Ionicons name={stat.icon as any} size={20} color={colors.background} />
              </View>
            </BlurView>
            <ThemedText style={styles.value}>{stat.value}</ThemedText>
            <ThemedText style={styles.label}>{stat.label}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconBackground: {
    padding: 8,
    borderRadius: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    opacity: 0.8,
  },
});
