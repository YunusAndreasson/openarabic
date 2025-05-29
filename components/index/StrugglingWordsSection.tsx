import React, { memo, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { State } from 'ts-fsrs';
import { Ionicons } from '@expo/vector-icons';

import BaseCard from '@/components/BaseCard';
import SectionTitle from '@/components/SectionTitle';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useSimpleAudioPlayer } from '@/hooks/useSimpleAudioPlayer';
import type { StudyWord } from '@/types/vocabulary.types';
import { lightFeedback } from '@/utils/haptics';

interface StrugglingWordsProps {
  words: StudyWord[];
  isLoading?: boolean;
}

interface WordCardProps {
  word: StudyWord;
  onPlayAudio: (url: string | null) => void;
}

interface DifficultyInfo {
  level: number;
  color: string;
  icon: any; // Using 'any' type to match original implementation
  label: string;
}

// Difficulty categories with minimal information
const DIFFICULTY_CATEGORIES = [
  {
    icon: 'checkmark-circle',
    label: 'Mastering',
  },
  {
    icon: 'trending-up',
    label: 'Improving',
  },
  {
    icon: 'sync',
    label: 'Review soon',
  },
  {
    icon: 'time',
    label: 'Needs practice',
  },
  {
    icon: 'alert-circle',
    label: 'Focus word',
  },
];

/**
 * Calculates the difficulty information for a word based on FSRS parameters
 */
const calculateWordDifficulty = (
  word: StudyWord,
  colors: ReturnType<typeof useColors>
): DifficultyInfo => {
  // Extract FSRS data for difficulty assessment
  const stability = word.fsrs_stability || 0;
  const state = word.fsrs_state || State.New;
  const reviewCount = word.fsrs_reps || 0;
  const successStreak = word.success_streak || 0;
  const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review).getTime() : 0;
  const now = Date.now();
  const daysSinceLastReview =
    lastReview > 0 ? Math.floor((now - lastReview) / (1000 * 60 * 60 * 24)) : 30;

  // Base difficulty score
  let difficultyScore = 0;

  // Factor 1: FSRS State
  switch (state) {
    case State.New:
      difficultyScore += 30;
      break;
    case State.Learning:
      difficultyScore += 25;
      break;
    case State.Relearning:
      difficultyScore += 22;
      break;
    case State.Review:
      difficultyScore += 10;
      break;
  }

  // Factor 2: Stability
  if (stability <= 0.5) difficultyScore += 30;
  else if (stability <= 2) difficultyScore += 20;
  else if (stability <= 10) difficultyScore += 10;
  else if (stability <= 40) difficultyScore += 5;

  // Factor 3: Review Count
  if (reviewCount >= 7) difficultyScore += 10;
  else if (reviewCount >= 3) difficultyScore += 5;

  // Factor 4: Success Streak
  if (successStreak >= 3) difficultyScore -= 15;
  else if (successStreak >= 1) difficultyScore -= 8;

  // Factor 5: Days since last review
  if (daysSinceLastReview >= 7) difficultyScore += 10;

  // Calculate final difficulty level on a scale of 1-5
  const level = Math.min(5, Math.max(1, Math.ceil(difficultyScore / 20)));

  // Get the category index (0-4)
  const categoryIndex = Math.min(Math.max(0, level - 1), DIFFICULTY_CATEGORIES.length - 1);
  const category = DIFFICULTY_CATEGORIES[categoryIndex];

  // Color based on difficulty
  let color;
  if (level === 5) color = colors.error;
  else if (level === 4)
    color = colors.warning; // Pure warning color for level 4
  else if (level === 3)
    color = colors.warning; // Use pure warning color for consistency
  else if (level === 2) color = colors.info;
  else color = colors.success;

  return {
    level,
    color,
    icon: category?.icon || 'sync',
    label: category?.label || 'Review soon',
  };
};

const WordCard = memo(({ word, onPlayAudio }: WordCardProps) => {
  const colors = useColors();

  // Get the Arabic text from the root
  const arabicText = word.root?.letters || '';
  // Get the English translation from the root
  const englishText = word.root?.meaning || '';

  // Calculate difficulty info
  const difficultyInfo = calculateWordDifficulty(word, colors);

  const handlePress = () => {
    lightFeedback();
    // Play the audio from the root if available
    if (word.root?.audio_url) {
      onPlayAudio(word.root.audio_url);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.75}>
      <BaseCard style={styles.wordCard} shadowSize="small">
        <View style={styles.wordCardContent}>
          <ThemedText
            type="arabic"
            style={styles.arabicText}
            arabicFontSize={26}
            colorName="arabicText"
          >
            {arabicText}
          </ThemedText>

          <ThemedText type="caption" colorName="textTertiary" style={styles.englishText}>
            {englishText}
          </ThemedText>

          {/* Minimal Difficulty Indicator */}
          <View style={styles.difficultyContainer}>
            <Ionicons
              name={difficultyInfo.icon}
              size={14}
              color={difficultyInfo.color}
              style={styles.difficultyIcon}
            />
            <ThemedText
              type="caption"
              style={[styles.difficultyText, { color: difficultyInfo.color }]}
              skipDefaultColor
            >
              {difficultyInfo.label}
            </ThemedText>
          </View>
        </View>
      </BaseCard>
    </TouchableOpacity>
  );
});

WordCard.displayName = 'WordCard';

const StrugglingWordsSection = memo(({ words = [], isLoading = false }: StrugglingWordsProps) => {
  const displayedWords = useMemo(() => words.slice(0, 10), [words]);
  const { playAudio } = useSimpleAudioPlayer();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SectionTitle title="Difficult Words" isFirstSection={true} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (displayedWords.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionTitle title="Difficult Words" isFirstSection={true} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {displayedWords.map(word => (
          <WordCard key={`word-${word.root_id}`} word={word} onPlayAudio={playAudio} />
        ))}
      </ScrollView>
    </View>
  );
});

StrugglingWordsSection.displayName = 'StrugglingWordsSection';

const styles = StyleSheet.create({
  container: {
    // Removed margins - SectionTitle handles all section spacing
  },
  scrollContent: {
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  wordCard: {
    width: 145,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  wordCardContent: {
    padding: LAYOUT.SPACING.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  englishText: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: LAYOUT.SPACING.MICRO,
    opacity: 0.9,
  },
  difficultyIcon: {
    marginRight: 4,
  },
  difficultyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StrugglingWordsSection;
