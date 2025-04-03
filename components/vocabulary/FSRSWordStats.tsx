import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '@/hooks/useColors';

// Define state names for clearer display
const STATE_NAMES = ['New', 'Learning', 'Review', 'Relearning'];

interface FSRSWordStatsProps {
  difficulty: number;
  stability: number;
  state: number;
  nextReview: Date | string;
  reviewCount: number;
  lapses: number;
}

export function FSRSWordStats({
  difficulty,
  stability,
  state,
  nextReview,
  reviewCount,
  lapses,
}: FSRSWordStatsProps) {
  const colors = useColors();

  // Format the next review date
  const formatDate = (date: Date | string) => {
    const reviewDate = typeof date === 'string' ? new Date(date) : date;
    return reviewDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate difficulty text and color
  const getDifficultyInfo = (diff: number) => {
    if (diff < 0.25) return { text: 'Easy', color: colors.success };
    if (diff < 0.5) return { text: 'Medium', color: colors.warning };
    return { text: 'Hard', color: colors.error };
  };

  const difficultyInfo = getDifficultyInfo(difficulty);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ThemedText style={styles.label}>State:</ThemedText>
        <ThemedText>{STATE_NAMES[state] || 'Unknown'}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText style={styles.label}>Difficulty:</ThemedText>
        <ThemedText style={[styles.difficultyText, { color: difficultyInfo.color }]}>
          {difficultyInfo.text} ({(difficulty * 100).toFixed(0)}%)
        </ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText style={styles.label}>Stability:</ThemedText>
        <ThemedText>{stability.toFixed(1)} days</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText style={styles.label}>Next Review:</ThemedText>
        <ThemedText>{formatDate(nextReview)}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText style={styles.label}>Reviews:</ThemedText>
        <ThemedText>{reviewCount}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText style={styles.label}>Lapses:</ThemedText>
        <ThemedText>{lapses}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    marginVertical: 8,
    padding: 10,
  },
  difficultyText: {
    // The color will be set dynamically
  },
  label: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
});
