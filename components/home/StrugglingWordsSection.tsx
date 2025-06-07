import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { State } from 'ts-fsrs';

import BaseCard from '@/components/BaseCard';
import SectionTitle from '@/components/SectionTitle';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useColors } from '@/hooks/theme/useColors';
import type { StudyWord } from '@/types/vocabulary.types';

// Audio configuration
const AUDIO_DELAY_BETWEEN_LANGUAGES = 300; // Minimal delay for immediate English playback

interface StrugglingWordsProps {
  words: StudyWord[];
  isLoading?: boolean;
}

interface WordCardProps {
  word: StudyWord;
  onPlayAudio: (url: string | null, englishUrl?: string | null, wordId?: string) => void;
  isPlaying: boolean;
}

interface DifficultyInfo {
  level: number;
  color: string;
  icon: any; // Using 'any' type to match original implementation
  label: string;
  backgroundColor: string;
}

// Difficulty categories with minimal information
const DIFFICULTY_CATEGORIES = [
  {
    icon: 'checkmark-circle',
    label: 'Strong',
  },
  {
    icon: 'trending-up',
    label: 'Good',
  },
  {
    icon: 'sync',
    label: 'Review',
  },
  {
    icon: 'time',
    label: 'Practice',
  },
  {
    icon: 'alert-circle',
    label: 'Focus',
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

  // Color based on difficulty with background variants
  let color, backgroundColor;
  if (level === 5) {
    color = colors.error;
    backgroundColor = colors.error + '10';
  } else if (level === 4) {
    color = colors.warning;
    backgroundColor = colors.warning + '10';
  } else if (level === 3) {
    color = colors.warning;
    backgroundColor = colors.warning + '08';
  } else if (level === 2) {
    color = colors.info;
    backgroundColor = colors.info + '10';
  } else {
    color = colors.success;
    backgroundColor = colors.success + '10';
  }

  return {
    level,
    color,
    backgroundColor,
    icon: category?.icon || 'sync',
    label: category?.label || 'Review',
  };
};

// Animated Sound Wave Component
const SoundWave = memo(({ isPlaying, color }: { isPlaying: boolean; color: string }) => {
  const scale1 = useSharedValue(0.3);
  const scale2 = useSharedValue(0.5);
  const scale3 = useSharedValue(0.7);

  React.useEffect(() => {
    if (isPlaying) {
      scale1.value = withRepeat(withTiming(1, { duration: 400 }), -1, true);
      scale2.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
      scale3.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
    } else {
      scale1.value = withTiming(0.3, { duration: 200 });
      scale2.value = withTiming(0.5, { duration: 200 });
      scale3.value = withTiming(0.7, { duration: 200 });
    }
  }, [isPlaying]);

  const wave1Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale1.value }],
  }));

  const wave2Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale2.value }],
  }));

  const wave3Style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale3.value }],
  }));

  return (
    <View style={styles.soundWaveContainer}>
      <Animated.View style={[styles.soundWave, { backgroundColor: color }, wave1Style]} />
      <Animated.View style={[styles.soundWave, { backgroundColor: color }, wave2Style]} />
      <Animated.View style={[styles.soundWave, { backgroundColor: color }, wave3Style]} />
    </View>
  );
});

SoundWave.displayName = 'SoundWave';

const WordCard = memo(({ word, onPlayAudio, isPlaying }: WordCardProps) => {
  const colors = useColors();
  const pressOpacity = useSharedValue(1);

  // Get the Arabic text from the root
  const arabicText = word.root?.letters || '';
  // Get the English translation from the root
  const englishText = word.root?.meaning || '';

  // Calculate difficulty info
  const difficultyInfo = calculateWordDifficulty(word, colors);

  const handlePressIn = useCallback(() => {
    pressOpacity.value = withTiming(0.7, {
      duration: 100,
    });
  }, []);

  const handlePressOut = useCallback(() => {
    pressOpacity.value = withTiming(1, {
      duration: 150,
    });
  }, []);

  const handlePress = useCallback(() => {
    // Play both Arabic and English audio from the root if available
    if (word.root?.audio_url || word.root?.audio_url_en) {
      onPlayAudio(word.root.audio_url, word.root.audio_url_en, `word-${word.root_id}`);
    }
  }, [word, onPlayAudio]);

  const pressStyle = useAnimatedStyle(() => ({
    opacity: pressOpacity.value,
  }));

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        accessibilityHint="Tap to hear pronunciation"
        accessibilityLabel={`Practice word: ${arabicText}, meaning: ${englishText}`}
        accessibilityRole="button"
        activeOpacity={1}
        style={styles.touchableArea}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={pressStyle}>
          <BaseCard shadowSize="small" style={styles.wordCard}>
            {/* Inner border effect when playing - no layout impact */}
            {isPlaying && (
              <View style={[styles.innerBorder, { borderColor: difficultyInfo.color + '40' }]} />
            )}

            <View style={styles.wordCardContent}>
              <ThemedText
                arabicFontSize={26}
                colorName="arabicText"
                style={styles.arabicText}
                type="arabic"
              >
                {arabicText}
              </ThemedText>

              <ThemedText colorName="textTertiary" style={styles.englishText} type="caption">
                {englishText}
              </ThemedText>

              {/* Enhanced Difficulty Indicator */}
              <View
                style={[
                  styles.difficultyContainer,
                  { backgroundColor: difficultyInfo.backgroundColor },
                ]}
              >
                <View style={styles.difficultyContent}>
                  {isPlaying ? (
                    <SoundWave color={difficultyInfo.color} isPlaying={isPlaying} />
                  ) : (
                    <Ionicons
                      color={difficultyInfo.color}
                      name={difficultyInfo.icon}
                      size={14}
                      style={styles.difficultyIcon}
                    />
                  )}
                  <ThemedText
                    skipDefaultColor
                    style={[styles.difficultyText, { color: difficultyInfo.color }]}
                    type="caption"
                  >
                    {isPlaying ? 'Playing' : difficultyInfo.label}
                  </ThemedText>
                </View>
              </View>
            </View>
          </BaseCard>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
});

WordCard.displayName = 'WordCard';

const StrugglingWordsSection = memo(({ words = [], isLoading = false }: StrugglingWordsProps) => {
  const displayedWords = useMemo(() => words.slice(0, 10), [words]);
  const { playAudio } = useSimpleAudioPlayer();
  const colors = useColors();
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);

  // Enhanced audio play function that plays both Arabic and English
  const playWordAudio = useCallback(
    async (arabicUrl: string | null, englishUrl?: string | null, wordId?: string) => {
      if (wordId) {
        setPlayingWordId(wordId);
      }

      if (arabicUrl) {
        await playAudio(arabicUrl);

        // Play English audio after a minimal delay if available
        if (englishUrl) {
          setTimeout(() => {
            playAudio(englishUrl);
          }, AUDIO_DELAY_BETWEEN_LANGUAGES);
        }
      } else if (englishUrl) {
        // Fallback to just English if no Arabic
        await playAudio(englishUrl);
      }

      // Clear playing state after audio duration (estimate 2-3 seconds)
      if (wordId) {
        setTimeout(() => {
          setPlayingWordId(null);
        }, 2500);
      }
    },
    [playAudio]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SectionTitle
          isFirstSection={true}
          subtitle="Practice these to improve your retention rate"
          title="Needs Practice"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.tint} size="large" />
        </View>
      </View>
    );
  }

  if (displayedWords.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionTitle
        isFirstSection={true}
        subtitle="Practice these to improve your retention rate"
        title="Needs Practice"
      />
      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
      >
        {displayedWords.map(word => (
          <WordCard
            key={`word-${word.root_id}`}
            isPlaying={playingWordId === `word-${word.root_id}`}
            word={word}
            onPlayAudio={playWordAudio}
          />
        ))}
      </ScrollView>
    </View>
  );
});

StrugglingWordsSection.displayName = 'StrugglingWordsSection';

const styles = StyleSheet.create({
  arabicText: {
    marginBottom: LAYOUT.SPACING.TINY,
    textAlign: 'center',
  },
  cardContainer: {
    marginRight: LAYOUT.SPACING.MEDIUM,
    position: 'relative',
    width: 145,
  },
  container: {
    // Removed margins - SectionTitle handles all section spacing
  },
  difficultyContainer: {
    borderRadius: 12,
    marginTop: LAYOUT.SPACING.TINY,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  difficultyIcon: {
    marginRight: 4,
  },
  difficultyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontWeight: '600',
    textAlign: 'center',
  },
  englishText: {
    marginBottom: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
  innerBorder: {
    borderRadius: 12,
    borderWidth: 2,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0, // Ensure it doesn't interfere with touch events
  },
  loadingContainer: {
    alignItems: 'center',
    height: 100,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingRight: LAYOUT.SPACING.MEDIUM,
  },
  soundWave: {
    borderRadius: 1,
    height: 14,
    marginHorizontal: 1,
    width: 2,
  },
  soundWaveContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 14,
    justifyContent: 'center',
    marginRight: 6,
    width: 16,
  },
  touchableArea: {
    flex: 1,
  },
  wordCard: {
    width: '100%',
  },
  wordCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.MEDIUM,
  },
});

export default StrugglingWordsSection;
